import { NextRequest, NextResponse } from 'next/server'
import { validateTextField, validateUKPostcode } from '@/lib/validation'
import { sanitizeInput } from '@/lib/validation'

// Rate limiting: Track requests per IP
const requestCounts = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 20 // requests per minute
const RATE_WINDOW = 60 * 1000 // 1 minute in milliseconds

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = requestCounts.get(ip)
  
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW })
    return true
  }
  
  if (record.count >= RATE_LIMIT) {
    return false
  }
  
  record.count++
  return true
}

// Clean up old rate limit records periodically
setInterval(() => {
  const now = Date.now()
  for (const [ip, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(ip)
    }
  }
}, RATE_WINDOW)

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
    
    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }
    
    const { action, postcode, addressId } = await request.json()
    
    // Validate action
    if (!action || !['find', 'retrieve'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }
    
    const loqateKey = process.env.LOQATE_KEY || process.env.NEXT_PUBLIC_LOQATE_KEY
    if (!loqateKey) {
      console.error('Loqate API key not configured')
      return NextResponse.json(
        { error: 'Address lookup service not configured' },
        { status: 500 }
      )
    }
    
    // Log key info for debugging (first few chars only)
    console.log('Using Loqate key starting with:', loqateKey.substring(0, 4) + '...')
    
    // Handle postcode search
    if (action === 'find') {
      if (!postcode || typeof postcode !== 'string') {
        return NextResponse.json(
          { error: 'Search term is required' },
          { status: 400 }
        )
      }
      
      // Sanitize search term (don't validate as strict postcode since users type partial postcodes)
      const searchTerm = sanitizeInput(postcode).trim()
      
      if (searchTerm.length < 2) {
        return NextResponse.json(
          { error: 'Please enter at least 2 characters' },
          { status: 400 }
        )
      }
      
      // Call Loqate Find API
      const url = `https://api.addressy.com/Capture/Interactive/Find/v1.10/json3.ws?` +
        `Key=${loqateKey}&` +
        `Text=${encodeURIComponent(searchTerm)}&` +
        `Country=GB&` +
        `Limit=100`
      
      console.log('Loqate Find URL:', url.replace(loqateKey, 'HIDDEN'))
      
      const response = await fetch(url)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Loqate Find API error:', response.status, errorText)
        return NextResponse.json(
          { error: 'Address lookup service error' },
          { status: 500 }
        )
      }
      
      const data = await response.json()
      
      // Check if Loqate returned an error
      if (data.Items && data.Items.length > 0 && data.Items[0].Error) {
        console.error('Loqate API error response:', data.Items[0])
        const errorMessage = data.Items[0].Description || data.Items[0].Cause || 'Address lookup failed'
        
        // Check for specific error codes
        if (data.Items[0].Error === '2' || errorMessage.includes('Unknown key')) {
          console.error('Loqate API key issue')
          return NextResponse.json(
            { error: 'Address lookup configuration error' },
            { status: 500 }
          )
        }
        
        return NextResponse.json(
          { error: errorMessage },
          { status: 400 }
        )
      }
      
      if (data.Items && data.Items.length > 0) {
        // Filter out error items and sanitize response data
        const validItems = data.Items.filter((item: any) => !item.Error)
        
        if (validItems.length === 0) {
          return NextResponse.json({ Items: [] })
        }
        
        const sanitizedItems = validItems.map((item: any) => ({
          Id: item.Id, // Don't sanitize IDs - Loqate needs them intact
          Text: sanitizeInput(item.Text || ''),
          Description: sanitizeInput(item.Description || ''),
          Type: item.Type || 'Address'
        }))
        
        return NextResponse.json({ Items: sanitizedItems })
      } else {
        return NextResponse.json({ Items: [] })
      }
    }
    
    // Handle address retrieve
    if (action === 'retrieve') {
      if (!addressId) {
        return NextResponse.json(
          { error: 'Address ID is required' },
          { status: 400 }
        )
      }
      
      // Basic validation for address ID - Loqate IDs can contain special chars
      if (addressId.length > 500) {
        return NextResponse.json(
          { error: 'Invalid address ID' },
          { status: 400 }
        )
      }
      
      // Don't sanitize the ID - Loqate needs it exactly as provided
      const sanitizedId = addressId
      
      // Call Loqate Retrieve API
      const url = `https://api.addressy.com/Capture/Interactive/Retrieve/v1.10/json3.ws?` +
        `Key=${loqateKey}&` +
        `Id=${encodeURIComponent(sanitizedId)}`
      
      console.log('Loqate Retrieve URL:', url.replace(loqateKey, 'HIDDEN'))
      console.log('Address ID being sent:', sanitizedId)
      
      const response = await fetch(url)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Loqate Retrieve API error:', response.status, errorText)
        return NextResponse.json(
          { error: 'Unable to retrieve address details' },
          { status: 500 }
        )
      }
      
      const data = await response.json()
      
      if (data.Items && data.Items.length > 0) {
        const address = data.Items[0]
        
        // Build sanitized address lines
        const addressLines = []
        if (address.Company) addressLines.push(sanitizeInput(address.Company))
        if (address.Line1) addressLines.push(sanitizeInput(address.Line1))
        if (address.Line2) addressLines.push(sanitizeInput(address.Line2))
        if (address.Line3) addressLines.push(sanitizeInput(address.Line3))
        if (address.City) addressLines.push(sanitizeInput(address.City))
        if (address.County) addressLines.push(sanitizeInput(address.County))
        
        return NextResponse.json({
          address: addressLines.filter(line => line).join(', '),
          postcode: sanitizeInput(address.PostalCode || ''),
          city: sanitizeInput(address.City || ''),
          county: sanitizeInput(address.County || '')
        })
      } else {
        return NextResponse.json(
          { error: 'Address not found' },
          { status: 404 }
        )
      }
    }
    
  } catch (error) {
    console.error('Address lookup error:', error)
    return NextResponse.json(
      { error: 'Failed to process address lookup' },
      { status: 500 }
    )
  }
}

// OPTIONS handled by middleware
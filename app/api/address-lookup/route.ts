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
    
    const loqateKey = process.env.NEXT_PUBLIC_LOQATE_KEY
    if (!loqateKey) {
      console.error('Loqate API key not configured')
      return NextResponse.json(
        { error: 'Address lookup service not configured' },
        { status: 500 }
      )
    }
    
    // Handle postcode search
    if (action === 'find') {
      if (!postcode) {
        return NextResponse.json(
          { error: 'Postcode is required' },
          { status: 400 }
        )
      }
      
      // Validate and sanitize postcode
      const postcodeValidation = validateUKPostcode(postcode)
      if (!postcodeValidation.isValid) {
        return NextResponse.json(
          { error: postcodeValidation.errors[0] },
          { status: 400 }
        )
      }
      
      const sanitizedPostcode = sanitizeInput(postcode).toUpperCase()
      
      // Call Loqate Find API
      const url = `https://api.addressy.com/Capture/Interactive/Find/v1.10/json3.ws?` +
        `Key=${loqateKey}&` +
        `SearchTerm=${encodeURIComponent(sanitizedPostcode)}&` +
        `Country=GB&` +
        `Limit=100`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.Items && data.Items.length > 0) {
        // Sanitize response data
        const sanitizedItems = data.Items.map((item: any) => ({
          Id: sanitizeInput(item.Id),
          Text: sanitizeInput(item.Text),
          Description: sanitizeInput(item.Description || ''),
          Type: sanitizeInput(item.Type)
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
      
      // Validate address ID (alphanumeric + basic chars)
      const idValidation = validateTextField(addressId, 'Address ID', 1, 100)
      if (!idValidation.isValid) {
        return NextResponse.json(
          { error: 'Invalid address ID' },
          { status: 400 }
        )
      }
      
      const sanitizedId = sanitizeInput(addressId)
      
      // Call Loqate Retrieve API
      const url = `https://api.addressy.com/Capture/Interactive/Retrieve/v1.10/json3.ws?` +
        `Key=${loqateKey}&` +
        `Id=${encodeURIComponent(sanitizedId)}`
      
      const response = await fetch(url)
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

// Add security headers
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}
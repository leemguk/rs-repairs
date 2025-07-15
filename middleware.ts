import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple rate limiting configuration
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Only apply to API routes
  if (pathname.startsWith('/api/')) {
    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
    
    // Simple rate limiting
    const key = `${ip}:${pathname}`
    const now = Date.now()
    const record = rateLimitMap.get(key)
    const limit = pathname.includes('checkout') ? 10 : 50 // Lower limit for payment endpoints
    
    if (!record || now > record.resetTime) {
      rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    } else if (record.count >= limit) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
          },
        }
      )
    } else {
      record.count++
    }
  }
  
  // Continue with the request
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
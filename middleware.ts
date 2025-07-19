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
  
  // Create response with security headers
  const response = NextResponse.next()
  
  // Add minimal security headers that are unlikely to break functionality
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Only set X-Frame-Options for non-widget paths to allow iframe embedding
  if (!pathname.includes('/widget/')) {
    response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  }
  
  // Add a permissive CSP that allows necessary resources
  // Start with report-only mode to test without breaking anything
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://vercel.live",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss: https://vercel.live wss://ws-us3.pusher.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://vercel.live",
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; ')
  
  // For widget paths, add frame-ancestors to allow embedding
  if (pathname.includes('/widget/')) {
    const cspWithFrameAncestors = csp + "; frame-ancestors 'self' https://www.ransomspares.co.uk https://ransomspares.co.uk https://www.ransomdev.co.uk https://ransomdev.co.uk http://localhost:*"
    response.headers.set('Content-Security-Policy-Report-Only', cspWithFrameAncestors)
  } else {
    response.headers.set('Content-Security-Policy-Report-Only', csp)
  }
  
  return response
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
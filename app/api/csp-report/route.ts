import { NextRequest, NextResponse } from 'next/server'

// CSP violation report type
interface CSPReport {
  'csp-report': {
    'document-uri': string
    'referrer'?: string
    'violated-directive': string
    'effective-directive': string
    'original-policy': string
    'disposition': string
    'blocked-uri'?: string
    'status-code'?: number
    'script-sample'?: string
    'source-file'?: string
    'line-number'?: number
    'column-number'?: number
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify content type
    const contentType = request.headers.get('content-type')
    if (!contentType?.includes('application/csp-report') && 
        !contentType?.includes('application/json')) {
      return new NextResponse('Invalid content type', { status: 400 })
    }

    // Parse the CSP report
    const report: CSPReport = await request.json()
    
    if (!report['csp-report']) {
      return new NextResponse('Invalid CSP report format', { status: 400 })
    }

    const violation = report['csp-report']
    
    // Log the violation (in production, you might want to send this to a logging service)
    console.log('[CSP Violation]', {
      documentUri: violation['document-uri'],
      violatedDirective: violation['violated-directive'],
      blockedUri: violation['blocked-uri'],
      sourceFile: violation['source-file'],
      lineNumber: violation['line-number'],
      disposition: violation['disposition'], // 'report' for report-only, 'enforce' for enforced
      timestamp: new Date().toISOString()
    })

    // In development, log more details
    if (process.env.NODE_ENV === 'development') {
      console.log('[CSP Full Report]', JSON.stringify(violation, null, 2))
    }

    // Always return 204 No Content for CSP reports
    return new NextResponse(null, { status: 204 })
    
  } catch (error) {
    // Log error but still return success to prevent browser retries
    console.error('Error processing CSP report:', error)
    return new NextResponse(null, { status: 204 })
  }
}

// CSP reports should only be POST
export async function GET() {
  return new NextResponse('Method not allowed', { status: 405 })
}
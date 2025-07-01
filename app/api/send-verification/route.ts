import { NextRequest, NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'
import { supabase } from '@/lib/supabase'

// Set SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      )
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Store verification code in database (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now

    const { error: dbError } = await supabase
      .from('verification_codes')
      .upsert({
        email: email.toLowerCase(),
        code: verificationCode,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      })

    if (dbError) {
      console.error('Database error:', dbError)
      // Continue anyway - we can still send email even if DB fails
    }

    // Send verification email
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject: 'Verify Your Diagnostic Tool Access - RS Spares',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>RS Spares Verification Code</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #f3f4f6; padding: 32px;">
            <!-- Email Container -->
            <div style="background-color: white; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); overflow: hidden;">
              
              <!-- Header -->
              <div style="background: linear-gradient(to right, #2563eb, #1d4ed8); padding: 32px 32px 24px 32px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="background-color: rgba(255, 255, 255, 0.2); padding: 8px; border-radius: 8px; display: inline-block;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                    </svg>
                  </div>
                  <div>
                    <h1 style="margin: 0; color: white; font-size: 24px; font-weight: bold;">RS Spares</h1>
                    <p style="margin: 0; color: #bfdbfe; font-size: 14px;">Home Appliance Solutions</p>
                  </div>
                </div>
              </div>

              <!-- Main Content -->
              <div style="padding: 32px;">
                <div style="text-align: center; margin-bottom: 32px;">
                  <div style="background-color: #eff6ff; padding: 16px; border-radius: 50%; width: 64px; height: 64px; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </div>
                  <h2 style="color: #111827; font-size: 24px; font-weight: bold; margin: 0 0 8px 0;">Verify Your Diagnostic Tool Access</h2>
                  <p style="color: #6b7280; font-size: 18px; margin: 0;">Complete your setup to start diagnosing appliance issues</p>
                </div>

                <!-- Verification Code Card -->
                <div style="border: 2px solid #dbeafe; border-radius: 8px; margin-bottom: 32px;">
                  <div style="padding: 24px; text-align: center;">
                    <p style="font-size: 14px; color: #6b7280; margin: 0 0 12px 0;">Your verification code is:</p>
                    <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                      <span style="font-size: 36px; font-family: 'Courier New', monospace; font-weight: bold; color: #111827; letter-spacing: 6px;">${verificationCode}</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; color: #6b7280;">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12,6 12,12 16,14"/>
                      </svg>
                      <span>Expires in 10 minutes</span>
                    </div>
                  </div>
                </div>

                <!-- Instructions -->
                <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
                  <h3 style="font-weight: 600; color: #111827; margin: 0 0 12px 0;">How to use this code:</h3>
                  <div style="color: #374151;">
                    <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 8px;">
                      <span style="background-color: #2563eb; color: white; font-size: 12px; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-weight: 600; margin-top: 2px;">1</span>
                      <span>Return to the RS Spares Diagnostic Tool</span>
                    </div>
                    <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 8px;">
                      <span style="background-color: #2563eb; color: white; font-size: 12px; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-weight: 600; margin-top: 2px;">2</span>
                      <span>Enter the 6-digit code above</span>
                    </div>
                    <div style="display: flex; align-items: flex-start; gap: 12px;">
                      <span style="background-color: #2563eb; color: white; font-size: 12px; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-weight: 600; margin-top: 2px;">3</span>
                      <span>Start diagnosing your appliance issues</span>
                    </div>
                  </div>
                </div>

                <!-- Security Notice -->
                <div style="background-color: #fffbeb; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin-bottom: 32px;">
                  <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    <div>
                      <h4 style="font-weight: 600; color: #92400e; margin: 0 0 4px 0;">Security Notice</h4>
                      <p style="font-size: 14px; color: #b45309; margin: 0;">
                        Never share this code with anyone. RS Spares will never ask for your verification code via phone or email.
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Help Section -->
                <div style="text-align: center;">
                  <p style="color: #6b7280; margin: 0 0 16px 0;">Need help? Our support team is here for you.</p>
                  <div style="display: flex; flex-direction: column; gap: 16px; justify-content: center;">
                    <a href="mailto:support@rsspares.com" style="background-color: #2563eb; color: white; padding: 8px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
                      Contact Support
                    </a>
                    <a href="https://rsspares.com/help" style="border: 1px solid #d1d5db; color: #374151; padding: 8px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
                      Help Center
                    </a>
                  </div>
                </div>
              </div>

              <!-- Separator -->
              <div style="height: 1px; background-color: #e5e7eb;"></div>

              <!-- Footer -->
              <div style="background-color: #f9fafb; padding: 24px 32px;">
                <div style="text-align: center;">
                  <p style="font-size: 14px; color: #6b7280; margin: 0 0 8px 0;">
                    <strong>RS Spares</strong> - Your trusted partner for appliance diagnostics
                  </p>
                  <p style="font-size: 12px; color: #6b7280; margin: 0 0 16px 0;">
                    123 Industrial Way, Tech City, TC 12345 | Phone: (555) 123-4567
                  </p>
                  <div style="font-size: 12px; color: #6b7280;">
                    <a href="#" style="color: #6b7280; text-decoration: none;">Privacy Policy</a>
                    <span style="margin: 0 8px;">•</span>
                    <a href="#" style="color: #6b7280; text-decoration: none;">Terms of Service</a>
                    <span style="margin: 0 8px;">•</span>
                    <a href="#" style="color: #6b7280; text-decoration: none;">Unsubscribe</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
RS Spares - Verify Your Diagnostic Tool Access

Your verification code is: ${verificationCode}

This code expires in 10 minutes.

How to use this code:
1. Return to the RS Spares Diagnostic Tool
2. Enter the 6-digit code above
3. Start diagnosing your appliance issues

Security Notice: Never share this code with anyone. RS Spares will never ask for your verification code via phone or email.

Need help? Contact us at support@rsspares.com or visit https://rsspares.com/help

RS Spares - Your trusted partner for appliance diagnostics
123 Industrial Way, Tech City, TC 12345 | Phone: (555) 123-4567
      `
    }

    await sgMail.send(msg)

    return NextResponse.json({ 
      success: true, 
      message: 'Verification code sent successfully' 
    })

  } catch (error) {
    console.error('Send verification error:', error)
    return NextResponse.json(
      { error: 'Failed to send verification code. Please try again.' },
      { status: 500 }
    )
  }
}

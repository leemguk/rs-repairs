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
      subject: 'Verify Your Diagnostic Tool Access - Repair Help',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Repair Help - Verification Code</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4;">
                <tr>
                    <td align="center" style="padding: 20px;">
                        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; max-width: 600px;">
                            
                            <!-- Header -->
                            <tr>
                                <td style="background-color: #2563eb; padding: 30px; text-align: center;">
                                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Repair Help</h1>
                                    <p style="color: #bfdbfe; margin: 5px 0 0 0; font-size: 14px;">Home Appliance Repair Solutions</p>
                                </td>
                            </tr>
                            
                            <!-- Main Content -->
                            <tr>
                                <td style="padding: 40px 30px;">
                                    <h2 style="color: #1f2937; margin: 0 0 10px 0; font-size: 24px; text-align: center;">Verify Your Diagnostic Tool Access</h2>                                    
                                    <!-- Verification Code -->
                                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                        <tr>
                                            <td style="text-align: center; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                                                <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">Your verification code is:</p>
                                                <div style="background-color: #ffffff; padding: 20px; border-radius: 6px; margin: 10px 0;">
                                                    <span style="font-size: 36px; font-family: 'Courier New', monospace; font-weight: bold; color: #1f2937; letter-spacing: 8px;">${verificationCode}</span>
                                                </div>
                                                <p style="color: #9ca3af; margin: 10px 0 0 0; font-size: 12px;">Expires in 10 minutes</p>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <!-- Instructions -->
                                    <h3 style="color: #1f2937; margin: 30px 0 15px 0; font-size: 18px;">How to use this code:</h3>
                                    <ol style="color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.6;">
                                        <li style="margin-bottom: 8px;">Return to the Repair Help Diagnostic Tool</li>
                                        <li style="margin-bottom: 8px;">Enter the 6-digit code above</li>
                                        <li style="margin-bottom: 8px;">Start diagnosing your appliance issues</li>
                                    </ol>
                                    

                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                                    <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 14px; font-weight: bold;">Repair Help</p>
                                    <p style="color: #9ca3af; margin: 0 0 15px 0; font-size: 12px;">Your trusted partner for appliance diagnostics</p>
                                    <p style="color: #9ca3af; margin: 0 0 15px 0; font-size: 11px;">Part of the Ransom Spares Group, Unit 3 Flushing Meadow, Yeovil, BA21 5DL</p>
                                    <p style="color: #9ca3af; margin: 0; font-size: 11px;">
                                        <a href="#" style="color: #6b7280; text-decoration: none;">Privacy Policy</a> | 
                                        <a href="#" style="color: #6b7280; text-decoration: none;">Terms of Service</a> | 
                                        <a href="#" style="color: #6b7280; text-decoration: none;">Unsubscribe</a>
                                    </p>
                                </td>
                            </tr>
                            
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
      `,
      text: `
Repair Help - Verify Your Diagnostic Tool Access

Your verification code is: ${verificationCode}

This code expires in 10 minutes.

How to use this code:
1. Return to the Repair Help Diagnostic Tool
2. Enter the 6-digit code above
3. Start diagnosing your appliance issues

Security Notice: Never share this code with anyone. Repair Help will never ask for your verification code via phone or email.

Need help? Contact us through our support channels

Repair Help - Your trusted partner for appliance diagnostics
Part of the Ransom Spares Group, Unit 3 Flushing Meadow, Yeovil, BA21 5DL
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

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
      subject: 'Your RS Repairs Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #16a34a; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">RS Repairs</h1>
            <p style="margin: 5px 0 0 0;">Appliance Repair Service</p>
          </div>
          
          <div style="padding: 30px 20px; background-color: #f9f9f9;">
            <h2 style="color: #333; margin-top: 0;">Your Verification Code</h2>
            <p style="color: #666; font-size: 16px;">
              Thank you for using our kAI appliance diagnostic service. Please enter this verification code to continue:
            </p>
            
            <div style="background-color: white; border: 2px solid #16a34a; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <div style="font-size: 32px; font-weight: bold; color: #16a34a; letter-spacing: 8px;">
                ${verificationCode}
              </div>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              This code will expire in 10 minutes. If you didn't request this code, you can safely ignore this email.
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="color: #888; font-size: 12px; margin: 0;">
                RS Repairs - Professional Appliance Repair Service<br>
                This is an automated message, please do not reply.
              </p>
            </div>
          </div>
        </div>
      `,
      text: `
Your RS Repairs Verification Code: ${verificationCode}

Thank you for using our kAI appliance diagnostic service. Please enter this verification code to continue.

This code will expire in 10 minutes. If you didn't request this code, you can safely ignore this email.

RS Repairs - Professional Appliance Repair Service
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

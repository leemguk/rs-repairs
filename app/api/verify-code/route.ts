import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()

    // Validate input
    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and verification code are required' },
        { status: 400 }
      )
    }

    // Check if code is correct and not expired
    const { data: verificationData, error: fetchError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('code', code)
      .single()

    if (fetchError || !verificationData) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      )
    }

    // Check if code has expired
    const now = new Date()
    const expiresAt = new Date(verificationData.expires_at)

    if (now > expiresAt) {
      // Delete expired code
      await supabase
        .from('verification_codes')
        .delete()
        .eq('email', email.toLowerCase())

      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Code is valid - delete it so it can't be used again
    await supabase
      .from('verification_codes')
      .delete()
      .eq('email', email.toLowerCase())
      .eq('code', code)

    return NextResponse.json({ 
      success: true, 
      message: 'Email verified successfully' 
    })

  } catch (error) {
    console.error('Verify code error:', error)
    return NextResponse.json(
      { error: 'Failed to verify code. Please try again.' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase'
import { validateAmount, validateEmail, sanitizeInput } from '@/lib/validation'
import { v4 as uuidv4 } from 'uuid'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

export async function POST(request: NextRequest) {
  try {
    const { amount, currency = 'gbp', bookingId, bookingData, isWidget } = await request.json()

    // Validate required fields
    if (!bookingId || typeof bookingId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid booking ID' },
        { status: 400 }
      )
    }

    // Validate amount (min £10, max £1000)
    const amountValidation = validateAmount(amount, 1000, 100000)
    if (!amountValidation.isValid) {
      return NextResponse.json(
        { error: amountValidation.errors[0] },
        { status: 400 }
      )
    }

    // Validate email if provided
    if (bookingData?.email) {
      const emailValidation = validateEmail(bookingData.email)
      if (!emailValidation.isValid) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }
    }

    // Ensure amount is in pence (Stripe expects smallest currency unit)
    const amountInPence = Math.round(amount)
    
    // Generate idempotency key to prevent duplicate charges
    const idempotencyKey = `checkout_${bookingId}_${Date.now()}`

    // Get the base URL for redirects
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : request.headers.get('origin') || 'http://localhost:3000'

    // Sanitize booking data for Stripe
    const sanitizedBookingData = {
      serviceType: sanitizeInput(bookingData?.serviceType || 'Appliance Repair'),
      manufacturer: sanitizeInput(bookingData?.manufacturer || ''),
      applianceType: sanitizeInput(bookingData?.applianceType || ''),
      firstName: sanitizeInput(bookingData?.firstName || ''),
      email: bookingData?.email || undefined
    }

    // Create checkout session with idempotency key
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: `Repair Help - ${sanitizedBookingData.serviceType} Service`,
              description: `${sanitizedBookingData.manufacturer} ${sanitizedBookingData.applianceType}`.trim() || 'Appliance Repair',
            },
            unit_amount: amountInPence,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}&booking_id=${encodeURIComponent(bookingId)}${isWidget ? '&widget=true' : ''}`,
      cancel_url: `${baseUrl}/payment-cancelled?booking_id=${encodeURIComponent(bookingId)}${isWidget ? '&widget=true' : ''}`,
      customer_email: sanitizedBookingData.email,
      metadata: {
        bookingId: bookingId,
        customerName: sanitizedBookingData.firstName,
        serviceType: sanitizedBookingData.serviceType,
        appliance: `${sanitizedBookingData.manufacturer} ${sanitizedBookingData.applianceType}`.trim(),
      },
      payment_intent_data: {
        metadata: {
          bookingId: bookingId
        }
      },
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // Expire after 30 minutes
    }, {
      idempotencyKey: idempotencyKey
    })

    // Update booking with Stripe session ID
    if (bookingId) {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ 
          stripe_payment_id: session.id,
          payment_status: 'processing'
        })
        .eq('id', bookingId)

      if (updateError) {
        console.error('Failed to update booking with session ID:', updateError)
        // Continue anyway - session is created
      }
    }

    return NextResponse.json({
      sessionId: session.id,
    })

  } catch (error) {
    console.error('Checkout session creation error:', error)
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: `Payment error: ${error.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session. Please try again.' },
      { status: 500 }
    )
  }
}

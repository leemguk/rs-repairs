import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

export async function POST(request: NextRequest) {
  try {
    const { amount, currency = 'gbp', bookingId, bookingData } = await request.json()

    // Validate required fields
    if (!amount || !bookingId) {
      return NextResponse.json(
        { error: 'Missing required fields: amount and bookingId' },
        { status: 400 }
      )
    }

    // Ensure amount is in pence (Stripe expects smallest currency unit)
    const amountInPence = Math.round(amount)

    // Get the base URL for redirects
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : request.headers.get('origin') || 'http://localhost:3000'

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: `RS Repairs - ${bookingData?.serviceType || 'Appliance Repair'} Service`,
              description: `${bookingData?.manufacturer || ''} ${bookingData?.applianceType || ''}`.trim(),
            },
            unit_amount: amountInPence,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
      cancel_url: `${baseUrl}/payment-cancelled?booking_id=${bookingId}`,
      customer_email: bookingData?.email,
      metadata: {
        bookingId: bookingId,
        customerName: bookingData?.firstName || '',
        serviceType: bookingData?.serviceType || '',
        appliance: `${bookingData?.manufacturer || ''} ${bookingData?.applianceType || ''}`.trim(),
      },
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

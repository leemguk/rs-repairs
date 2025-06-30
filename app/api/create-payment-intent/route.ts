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

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPence,
      currency: currency,
      metadata: {
        bookingId: bookingId,
        customerName: bookingData?.firstName || '',
        customerEmail: bookingData?.email || '',
        serviceType: bookingData?.serviceType || '',
        appliance: `${bookingData?.manufacturer || ''} ${bookingData?.applianceType || ''}`.trim(),
      },
      description: `RS Repairs - ${bookingData?.serviceType || 'Appliance Repair'} Service`,
      receipt_email: bookingData?.email || undefined,
    })

    // Update booking with Stripe payment intent ID
    if (bookingId) {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ 
          stripe_payment_id: paymentIntent.id,
          payment_status: 'processing'
        })
        .eq('id', bookingId)

      if (updateError) {
        console.error('Failed to update booking with payment intent:', updateError)
        // Continue anyway - payment intent is created
      }
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })

  } catch (error) {
    console.error('Payment intent creation error:', error)
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: `Payment error: ${error.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create payment intent. Please try again.' },
      { status: 500 }
    )
  }
}

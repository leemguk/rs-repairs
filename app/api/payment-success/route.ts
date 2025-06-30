import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId } = await request.json()

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment Intent ID is required' },
        { status: 400 }
      )
    }

    // Retrieve payment intent from Stripe to verify status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment not completed successfully' },
        { status: 400 }
      )
    }

    // Extract booking ID from metadata
    const bookingId = paymentIntent.metadata.bookingId

    if (!bookingId) {
      return NextResponse.json(
        { error: 'No booking ID found in payment' },
        { status: 400 }
      )
    }

    // Update booking status to paid
    const { data: booking, error: updateError } = await supabase
      .from('bookings')
      .update({ 
        payment_status: 'paid',
        booking_status: 'confirmed'
      })
      .eq('id', bookingId)
      .eq('stripe_payment_id', paymentIntentId)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update booking status:', updateError)
      return NextResponse.json(
        { error: 'Failed to confirm booking. Please contact support.' },
        { status: 500 }
      )
    }

    // TODO: Send confirmation email here (using SendGrid)
    // You can use the same email system you built for verification

    return NextResponse.json({
      success: true,
      message: 'Payment successful and booking confirmed',
      bookingId: bookingId,
      booking: booking
    })

  } catch (error) {
    console.error('Payment success processing error:', error)
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: `Stripe error: ${error.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process payment confirmation. Please contact support.' },
      { status: 500 }
    )
  }
}

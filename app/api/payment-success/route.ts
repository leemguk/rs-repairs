import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId, bookingId } = await request.json()

    if (!sessionId || !bookingId) {
      return NextResponse.json(
        { error: 'Session ID and Booking ID are required' },
        { status: 400 }
      )
    }

    // Retrieve checkout session from Stripe to verify status
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed successfully' },
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
      .eq('stripe_payment_id', sessionId)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update booking status:', updateError)
      return NextResponse.json(
        { error: 'Failed to confirm booking. Please contact support.' },
        { status: 500 }
      )
    }

    // Send booking confirmation email
    try {
      const emailResponse = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/send-booking-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerEmail: booking.email,
          customerName: booking.full_name,
          bookingId: booking.id,
          serviceType: booking.service_type,
          servicePrice: booking.service_price,
          appliance: `${booking.manufacturer} ${booking.appliance_type}`,
          appointmentDate: booking.appointment_date,
          appointmentTime: booking.appointment_time,
          address: booking.address,
        }),
      })

      if (!emailResponse.ok) {
        console.error('Failed to send confirmation email')
        // Don't fail the whole request if email fails
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError)
      // Don't fail the whole request if email fails
    }

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

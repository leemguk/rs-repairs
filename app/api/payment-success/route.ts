import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import sgMail from '@sendgrid/mail'
import { supabase } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

// Set SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { sessionId, bookingId } = await request.json()

    console.log('Payment success processing:', { sessionId, bookingId })

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

    console.log('Booking updated successfully, sending email...')

    // Send booking confirmation email directly
    try {
      // Format service type for display
      const formatServiceType = (type: string) => {
        switch(type) {
          case 'same_day': return 'Same Day Service'
          case 'next_day': return 'Next Day Service'  
          case 'standard': return 'Standard Service'
          default: return type
        }
      }

      // Format appointment details
      const getAppointmentText = () => {
        if (booking.service_type === 'same_day') {
          return 'Today before 6pm'
        } else if (booking.service_type === 'next_day') {
          return `Tomorrow ${booking.appointment_time === 'AM' ? 'Morning (8am-1pm)' : 'Afternoon (1pm-6pm)'}`
        } else {
          const date = new Date(booking.appointment_date).toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric', 
            month: 'long',
            year: 'numeric'
          })
          return `${date} ${booking.appointment_time === 'AM' ? 'Morning (8am-1pm)' : 'Afternoon (1pm-6pm)'}`
        }
      }

      const emailMsg = {
        to: booking.email,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: `Booking Confirmed - RS Repairs Service #${booking.id.slice(0, 8)}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #16a34a; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">RS Repairs</h1>
              <p style="margin: 5px 0 0 0;">Professional Appliance Repair Service</p>
            </div>
            
            <div style="padding: 30px 20px; background-color: #f9f9f9;">
              <h2 style="color: #16a34a; margin-top: 0;">🎉 Booking Confirmed!</h2>
              <p style="color: #666; font-size: 16px;">Dear ${booking.full_name},</p>
              <p style="color: #666; font-size: 16px;">Thank you for choosing RS Repairs. Your booking has been confirmed and payment processed successfully.</p>
              
              <div style="background-color: white; border: 2px solid #16a34a; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #16a34a; margin-top: 0;">Booking Details</h3>
                <p><strong>Booking ID:</strong> #${booking.id.slice(0, 8)}</p>
                <p><strong>Service:</strong> ${formatServiceType(booking.service_type)}</p>
                <p><strong>Appliance:</strong> ${booking.manufacturer} ${booking.appliance_type}</p>
                <p><strong>Appointment:</strong> ${getAppointmentText()}</p>
                <p><strong>Address:</strong> ${booking.address}</p>
                <p><strong>Total Paid:</strong> <span style="color: #16a34a; font-weight: bold; font-size: 18px;">£${(booking.service_price / 100).toFixed(2)}</span></p>
              </div>
              
              <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
                <h4 style="color: #1e40af; margin-top: 0;">What Happens Next?</h4>
                <ul style="color: #1e40af; margin: 0; padding-left: 20px;">
                  <li>Our engineer will contact you to confirm the exact arrival time</li>
                  <li>You'll receive an SMS reminder before the appointment</li>
                  <li>All work comes with a 1-year warranty</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <p style="color: #666; font-size: 16px;">Need to contact us?</p>
                <p style="color: #16a34a; font-weight: bold; font-size: 18px;">📧 support@rs-repairs.co.uk</p>
              </div>
            </div>
          </div>
        `,
        text: `Booking Confirmed - RS Repairs
        
Dear ${booking.full_name},

Your booking has been confirmed and payment processed successfully.

Booking ID: #${booking.id.slice(0, 8)}
Service: ${formatServiceType(booking.service_type)}
Appliance: ${booking.manufacturer} ${booking.appliance_type}
Appointment: ${getAppointmentText()}
Total Paid: £${(booking.service_price / 100).toFixed(2)}

Our engineer will contact you to confirm the exact arrival time.

RS Repairs - Professional Appliance Repair Service`
      }

      await sgMail.send(emailMsg)
      console.log('Confirmation email sent successfully to:', booking.email)

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

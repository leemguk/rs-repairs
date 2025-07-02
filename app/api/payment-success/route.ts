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
        subject: `Booking Confirmed - RS Repairs Service ${booking.id.slice(0, 8)}`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>RS Repairs - Booking Confirmation</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4;">
                  <tr>
                      <td align="center" style="padding: 20px;">
                          <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; max-width: 600px;">
                              
                              <!-- Header -->
                              <tr>
                                  <td style="background-color: #2563eb; padding: 30px; text-align: center;">
                                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">RS Repairs</h1>
                                      <p style="color: #bfdbfe; margin: 5px 0 0 0; font-size: 14px;">Professional Appliance Repair Service</p>
                                  </td>
                              </tr>
                              
                              <!-- Main Content -->
                              <tr>
                                  <td style="padding: 40px 30px;">
                                      <h2 style="color: #1f2937; margin: 0 0 10px 0; font-size: 24px; text-align: center;">Booking Confirmed</h2>
                                      <p style="color: #6b7280; margin: 0 0 30px 0; font-size: 16px; text-align: center;">Your appointment has been successfully booked</p>
                                      
                                      <!-- Confirmation Message -->
                                      <div style="margin: 30px 0;">
                                          <p style="color: #4b5563; margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">Dear <strong>${booking.full_name}</strong>,</p>
                                          <p style="color: #4b5563; margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">Thank you for choosing RS Repairs, in association with Pacifica Group. Please check your booking details below. If there are any errors or omissions please call <strong>01010101010</strong> to amend.</p>
                                          <p style="color: #4b5563; margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">Your booking is now being processed and you will receive a text message to your mobile on the day of your engineer visit.</p>
                                      </div>
                                      
                                      <!-- Booking Details -->
                                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                          <tr>
                                              <td style="padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                                                  <h3 style="color: #1f2937; margin: 0 0 20px 0; font-size: 18px;">Booking Details</h3>
                                                  
                                                  <table width="100%" cellpadding="0" cellspacing="0">
                                                      <tr>
                                                          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                                              <strong style="color: #374151;">Booking ID:</strong>
                                                          </td>
                                                          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                                                              <span style="color: #6b7280;">${booking.id.slice(0, 8)}</span>
                                                          </td>
                                                      </tr>
                                                      <tr>
                                                          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                                              <strong style="color: #374151;">Customer Name:</strong>
                                                          </td>
                                                          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                                                              <span style="color: #6b7280;">${booking.full_name}</span>
                                                          </td>
                                                      </tr>
                                                      <tr>
                                                          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                                              <strong style="color: #374151;">Email:</strong>
                                                          </td>
                                                          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                                                              <span style="color: #6b7280;">${booking.email}</span>
                                                          </td>
                                                      </tr>
                                                      <tr>
                                                          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                                              <strong style="color: #374151;">Mobile:</strong>
                                                          </td>
                                                          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                                                              <span style="color: #6b7280;">${booking.mobile}</span>
                                                          </td>
                                                      </tr>
                                                      <tr>
                                                          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                                              <strong style="color: #374151;">Address:</strong>
                                                          </td>
                                                          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                                                              <span style="color: #6b7280;">${booking.address}</span>
                                                          </td>
                                                      </tr>
                                                      <tr>
                                                          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                                              <strong style="color: #374151;">Appliance:</strong>
                                                          </td>
                                                          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                                                              <span style="color: #6b7280;">${booking.manufacturer} ${booking.appliance_type}</span>
                                                          </td>
                                                      </tr>
                                                      <tr>
                                                          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                                              <strong style="color: #374151;">Fault Description:</strong>
                                                          </td>
                                                          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                                                              <span style="color: #6b7280;">${booking.fault_description}</span>
                                                          </td>
                                                      </tr>
                                                      <tr>
                                                          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                                              <strong style="color: #374151;">Service Type:</strong>
                                                          </td>
                                                          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                                                              <span style="color: #6b7280;">${formatServiceType(booking.service_type)}</span>
                                                          </td>
                                                      </tr>
                                                      <tr>
                                                          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                                              <strong style="color: #374151;">Appointment:</strong>
                                                          </td>
                                                          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                                                              <span style="color: #6b7280;">${getAppointmentText()}</span>
                                                          </td>
                                                      </tr>
                                                      <tr>
                                                          <td style="padding: 8px 0;">
                                                              <strong style="color: #374151;">Service Price:</strong>
                                                          </td>
                                                          <td style="padding: 8px 0; text-align: right;">
                                                              <span style="color: #2563eb; font-weight: bold; font-size: 18px;">£${(booking.service_price / 100).toFixed(2)}</span>
                                                          </td>
                                                      </tr>
                                                  </table>
                                              </td>
                                          </tr>
                                      </table>
                                  </td>
                              </tr>
                              
                              <!-- Footer -->
                              <tr>
                                  <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                                      <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 14px; font-weight: bold;">RS Repairs</p>
                                      <p style="color: #9ca3af; margin: 0 0 15px 0; font-size: 12px;">Professional Appliance Repair Service</p>
                                      <p style="color: #9ca3af; margin: 0 0 15px 0; font-size: 11px;">In association with Pacifica Group</p>
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
RS Repairs - Booking Confirmation

Dear ${booking.full_name},

Thank you for choosing RS Repairs, in association with Pacifica Group. Please check your booking details below. If there are any errors or omissions please call 01010101010 to amend.

Your booking is now being processed and you will receive a text message to your mobile on the day of your engineer visit.

Booking Details:
Booking ID: ${booking.id.slice(0, 8)}
Customer Name: ${booking.full_name}
Email: ${booking.email}
Mobile: ${booking.mobile}
Address: ${booking.address}
Appliance: ${booking.manufacturer} ${booking.appliance_type}
Fault Description: ${booking.fault_description}
Service Type: ${formatServiceType(booking.service_type)}
Appointment: ${getAppointmentText()}
Service Price: £${(booking.service_price / 100).toFixed(2)}

RS Repairs - Professional Appliance Repair Service
In association with Pacifica Group
        `
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

import { NextRequest, NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'

// Set SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { 
      customerEmail, 
      customerName, 
      bookingId, 
      serviceType, 
      servicePrice, 
      appliance, 
      appointmentDate, 
      appointmentTime,
      address 
    } = await request.json()

    // Validate required fields
    if (!customerEmail || !customerName || !bookingId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

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
      if (serviceType === 'same_day') {
        return 'Today before 6pm'
      } else if (serviceType === 'next_day') {
        return `Tomorrow ${appointmentTime === 'AM' ? 'Morning (8am-1pm)' : 'Afternoon (1pm-6pm)'}`
      } else {
        const date = new Date(appointmentDate).toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
        return `${date} ${appointmentTime === 'AM' ? 'Morning (8am-1pm)' : 'Afternoon (1pm-6pm)'}`
      }
    }

    // Send confirmation email
    const msg = {
      to: customerEmail,
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject: `Booking Confirmed - RS Repairs Service #${bookingId.slice(0, 8)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #16a34a; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">RS Repairs</h1>
            <p style="margin: 5px 0 0 0;">Professional Appliance Repair Service</p>
          </div>
          
          <div style="padding: 30px 20px; background-color: #f9f9f9;">
            <h2 style="color: #16a34a; margin-top: 0;">🎉 Booking Confirmed!</h2>
            <p style="color: #666; font-size: 16px;">
              Dear ${customerName},
            </p>
            <p style="color: #666; font-size: 16px;">
              Thank you for choosing RS Repairs. Your booking has been confirmed and payment processed successfully.
            </p>
            
            <div style="background-color: white; border: 2px solid #16a34a; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #16a34a; margin-top: 0;">Booking Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">Booking ID:</td>
                  <td style="padding: 8px 0; color: #666;">#${bookingId.slice(0, 8)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">Service:</td>
                  <td style="padding: 8px 0; color: #666;">${formatServiceType(serviceType)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">Appliance:</td>
                  <td style="padding: 8px 0; color: #666;">${appliance}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">Appointment:</td>
                  <td style="padding: 8px 0; color: #666;">${getAppointmentText()}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">Address:</td>
                  <td style="padding: 8px 0; color: #666;">${address}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">Total Paid:</td>
                  <td style="padding: 8px 0; color: #16a34a; font-weight: bold; font-size: 18px;">£${(servicePrice / 100).toFixed(2)}</td>
                </tr>
              </table>
            </div>
            
            <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
              <h4 style="color: #1e40af; margin-top: 0;">What Happens Next?</h4>
              <ul style="color: #1e40af; margin: 0; padding-left: 20px;">
                <li>Our engineer will contact you to confirm the exact arrival time</li>
                <li>You'll receive an SMS reminder before the appointment</li>
                <li>All work comes with a 1-year warranty</li>
                <li>Payment on completion - no upfront charges</li>
              </ul>
            </div>
            
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <h4 style="color: #92400e; margin-top: 0;">Important Information</h4>
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                Please ensure someone is available at the appointment time. If you need to reschedule, 
                contact us at least 24 hours in advance.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #666; font-size: 16px;">Need to contact us?</p>
              <p style="color: #16a34a; font-weight: bold; font-size: 18px;">
                📞 0800 123 4567<br>
                📧 support@rs-repairs.co.uk
              </p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="color: #888; font-size: 12px; margin: 0; text-align: center;">
                RS Repairs - Professional Appliance Repair Service<br>
                This is an automated confirmation email.
              </p>
            </div>
          </div>
        </div>
      `,
      text: `
Booking Confirmed - RS Repairs

Dear ${customerName},

Thank you for choosing RS Repairs. Your booking has been confirmed and payment processed successfully.

Booking Details:
- Booking ID: #${bookingId.slice(0, 8)}
- Service: ${formatServiceType(serviceType)}
- Appliance: ${appliance}
- Appointment: ${getAppointmentText()}
- Address: ${address}
- Total Paid: £${(servicePrice / 100).toFixed(2)}

What Happens Next?
- Our engineer will contact you to confirm the exact arrival time
- You'll receive an SMS reminder before the appointment
- All work comes with a 1-year warranty
- Payment on completion - no upfront charges

Need to contact us?
Phone: 0800 123 4567
Email: support@rs-repairs.co.uk

RS Repairs - Professional Appliance Repair Service
      `
    }

    await sgMail.send(msg)

    return NextResponse.json({ 
      success: true, 
      message: 'Booking confirmation email sent successfully' 
    })

  } catch (error) {
    console.error('Send booking confirmation error:', error)
    return NextResponse.json(
      { error: 'Failed to send confirmation email. Please try again.' },
      { status: 500 }
    )
  }
}

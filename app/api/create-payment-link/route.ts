import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20', // Use a more stable API version
})

export async function POST(request: NextRequest) {
  try {
    const { amount, bookingId, bookingData } = await request.json()

    if (!amount || !bookingId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create a simple payment link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `RS Repairs - ${bookingData?.serviceType || 'Repair'} Service`,
              description: `${bookingData?.manufacturer || ''} ${bookingData?.applianceType || ''}`.trim(),
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingId: bookingId,
        customerEmail: bookingData?.email || '',
      },
    })

    return NextResponse.json({
      paymentUrl: paymentLink.url,
    })

  } catch (error) {
    console.error('Payment link creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment link' },
      { status: 500 }
    )
  }
}

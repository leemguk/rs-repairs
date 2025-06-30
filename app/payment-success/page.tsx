'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Calendar, Mail, ArrowLeft, Loader2 } from 'lucide-react'

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const bookingId = searchParams.get('booking_id')
  const [isProcessing, setIsProcessing] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const processPayment = async () => {
      if (!sessionId || !bookingId) {
        setError('Missing payment information')
        setIsProcessing(false)
        return
      }

      try {
        const response = await fetch('/api/payment-success', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: sessionId,
            bookingId: bookingId,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to process payment')
        }

        setIsProcessing(false)
      } catch (error) {
        console.error('Payment processing error:', error)
        setError(error.message || 'Failed to process payment')
        setIsProcessing(false)
      }
    }

    processPayment()
  }, [sessionId, bookingId])

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
            <p className="text-gray-600">Processing your payment...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardContent className="p-8 text-center">
            <div className="text-red-600 mb-4">
              <CheckCircle className="h-12 w-12 mx-auto" />
            </div>
            <h1 className="text-xl font-bold text-red-800 mb-2">Payment Error</h1>
            <p className="text-red-600 mb-4">{error}</p>
            <Button 
              onClick={() => window.location.href = '/'}
              className="bg-red-600 hover:bg-red-700"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-green-200">
        <CardHeader className="text-center">
          <div className="text-green-600 mb-4">
            <CheckCircle className="h-16 w-16 mx-auto" />
          </div>
          <CardTitle className="text-2xl text-green-800">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            Your booking has been confirmed and payment processed successfully.
          </p>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Booking ID:</strong> {bookingId}
            </p>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center justify-center gap-2">
              <Mail className="h-4 w-4" />
              <span>Confirmation email sent</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Engineer will contact you to confirm appointment</span>
            </div>
          </div>

          <Button 
            onClick={() => window.location.href = '/'}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

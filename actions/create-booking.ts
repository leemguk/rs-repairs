'use server'

import { supabase } from '@/lib/supabase'
import { 
  validateEmail, 
  validateUKMobile, 
  validateName, 
  validatePostcode, 
  validateTextField,
  sanitizeInput,
  validateBookingData
} from '@/lib/validation'

interface BookingData {
  firstName: string
  email: string
  mobile: string
  fullAddress: string
  applianceType: string
  manufacturer: string
  applianceModel?: string
  applianceFault: string
  selectedDate?: string | null
  selectedTimeSlot?: string | null
}

interface PricingOption {
  type: 'same-day' | 'next-day' | 'standard'
  price: number
}

export async function createBooking(
  bookingData: BookingData,
  selectedPricing: PricingOption
): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  try {
    // Validate all input fields
    const validationResults = validateBookingData(bookingData)
    
    if (!validationResults.isValid) {
      return { 
        success: false, 
        error: validationResults.errors.join(', ') 
      }
    }

    // Additional validation for required fields
    if (!bookingData.applianceType || !bookingData.manufacturer || !bookingData.applianceFault) {
      return {
        success: false,
        error: 'Please fill in all required fields'
      }
    }

    // Validate pricing
    if (!selectedPricing || !selectedPricing.type || !selectedPricing.price) {
      return {
        success: false,
        error: 'Invalid pricing selection'
      }
    }

    // Validate price range (£10 - £1000)
    if (selectedPricing.price < 10 || selectedPricing.price > 1000) {
      return {
        success: false,
        error: 'Invalid price range'
      }
    }

    // Sanitize text inputs
    const sanitizedData = {
      full_name: sanitizeInput(bookingData.firstName),
      email: bookingData.email.toLowerCase().trim(),
      mobile: bookingData.mobile.replace(/\s/g, ''),
      address: sanitizeInput(bookingData.fullAddress),
      appliance_type: sanitizeInput(bookingData.applianceType),
      manufacturer: sanitizeInput(bookingData.manufacturer),
      model: bookingData.applianceModel ? sanitizeInput(bookingData.applianceModel) : null,
      fault_description: sanitizeInput(bookingData.applianceFault),
      service_type: selectedPricing.type === 'same-day' ? 'same_day' : 
                   selectedPricing.type === 'next-day' ? 'next_day' : 'standard',
      service_price: Math.round(selectedPricing.price * 100), // Convert to pence
      appointment_date: selectedPricing.type === 'same-day' 
        ? new Date().toISOString().split('T')[0]
        : selectedPricing.type === 'next-day' 
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : bookingData.selectedDate || null,
      appointment_time: selectedPricing.type === 'same-day' 
        ? 'Before 6pm' 
        : bookingData.selectedTimeSlot || null,
      payment_status: 'pending',
      booking_status: 'pending_payment'
    }

    // Validate appointment date/time for standard bookings
    if (selectedPricing.type === 'standard') {
      if (!sanitizedData.appointment_date || !sanitizedData.appointment_time) {
        return {
          success: false,
          error: 'Please select an appointment date and time'
        }
      }

      // Ensure appointment date is in the future
      const appointmentDate = new Date(sanitizedData.appointment_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (appointmentDate < today) {
        return {
          success: false,
          error: 'Appointment date must be in the future'
        }
      }
    }

    // Insert booking into database
    const { data, error } = await supabase
      .from('bookings')
      .insert([sanitizedData])
      .select()
      .single()

    if (error) {
      console.error('Error creating booking:', error)
      return {
        success: false,
        error: 'Failed to create booking. Please try again.'
      }
    }

    return {
      success: true,
      bookingId: data.id
    }

  } catch (error) {
    console.error('Create booking error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.'
    }
  }
}
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Clock, CheckCircle, Calendar, ChevronRight, User, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import type { Booking } from "@/lib/supabase"
import { getRepairBookingCategories, getRepairBookingBrands, getRepairBrandPrice } from "@/actions/get-repair-booking-options"
import { createBooking } from "@/actions/create-booking"

// Loqate interfaces
interface LoqateFindResult {
  Id: string
  Type: string
  Text: string
  Highlight: string
  Description: string
}

interface LoqateRetrieveResult {
  Id: string
  Line1: string
  Line2: string
  Line3: string
  Line4: string
  Line5: string
  City: string
  PostalCode: string
  District: string
  BuildingName: string
  BuildingNumber: string
  Street: string
  [key: string]: any  // This allows for any additional fields
}

// Loqate API key
const LOQATE_KEY = process.env.NEXT_PUBLIC_LOQATE_KEY || ""

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
}

interface BookingData {
  applianceType: string
  manufacturer: string
  mobile: string
  selectedDate: string
  selectedTimeSlot: string
  applianceFault: string
  applianceModel: string
  firstName: string
  surname: string
  email: string
  address: string
  fullAddress: string
  postcode: string
  marketingConsent: boolean
}



export function BookingModal({ isOpen, onClose }: BookingModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [addressSuggestions, setAddressSuggestions] = useState<
    Array<{
      id: string
      text: string
      description: string
    }>
  >([])
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false)
  const [addressSearchValue, setAddressSearchValue] = useState("")
  const [selectedPricing, setSelectedPricing] = useState<{
    type: "same-day" | "next-day" | "standard"
    price: number
    description: string
    subtitle?: string
    available?: boolean
    date?: string
  } | null>(null)

  // Autocomplete states for Manufacturer (Category now uses dropdown)
  const [manufacturerSearch, setManufacturerSearch] = useState("")
  const [manufacturerOpen, setManufacturerOpen] = useState(false)
  
  // Dynamic data from database
  const [applianceTypes, setApplianceTypes] = useState<string[]>([])
  const [manufacturers, setManufacturers] = useState<string[]>([])
  const [isLoadingApplianceTypes, setIsLoadingApplianceTypes] = useState(true)
  const [isLoadingManufacturers, setIsLoadingManufacturers] = useState(false)

  const [bookingData, setBookingData] = useState<BookingData>({
    applianceType: "",
    manufacturer: "",
    mobile: "",
    selectedDate: "",
    selectedTimeSlot: "",
    applianceFault: "",
    applianceModel: "",
    firstName: "",
    surname: "",
    email: "",
    address: "",
    fullAddress: "",
    postcode: "",
    marketingConsent: true,
  })

  const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_your_key_here")

  // Load appliance types on mount
  useEffect(() => {
    const loadApplianceTypes = async () => {
      setIsLoadingApplianceTypes(true)
      try {
        const types = await getRepairBookingCategories()
        setApplianceTypes(types)
      } catch (error) {
        console.error('Error loading appliance types:', error)
      } finally {
        setIsLoadingApplianceTypes(false)
      }
    }

    loadApplianceTypes()
  }, [])

  // Load all brands on component mount (no dependency on category)
  useEffect(() => {
    const loadAllBrands = async () => {
      setIsLoadingManufacturers(true)
      try {
        const brands = await getRepairBookingBrands()
        setManufacturers(brands)
      } catch (error) {
        console.error('Failed to load brands:', error)
        setManufacturers([])
      } finally {
        setIsLoadingManufacturers(false)
      }
    }
    loadAllBrands()
  }, [])

  // Check if same-day and next-day booking are enabled
  const isSameDayEnabled = process.env.NEXT_PUBLIC_ENABLE_SAME_DAY_BOOKING === 'true'
  const isNextDayEnabled = process.env.NEXT_PUBLIC_ENABLE_NEXT_DAY_BOOKING === 'true'
  
  // State for dynamic pricing from database
  const [brandPricing, setBrandPricing] = useState({
    sameDayPrice: 189,
    nextDayPrice: 179,
    standardPrice: 169
  })

  // Load pricing when manufacturer changes
  useEffect(() => {
    const loadBrandPricing = async () => {
      if (!bookingData.manufacturer) {
        setBrandPricing({
          sameDayPrice: 189,
          nextDayPrice: 179,
          standardPrice: 169
        })
        return
      }
      
      try {
        const basePrice = await getRepairBrandPrice(bookingData.manufacturer)
        setBrandPricing({
          sameDayPrice: basePrice + 20,
          nextDayPrice: basePrice + 10,
          standardPrice: basePrice
        })
      } catch (error) {
        console.error('Failed to load brand pricing:', error)
        setBrandPricing({
          sameDayPrice: 189,
          nextDayPrice: 179,
          standardPrice: 169
        })
      }
    }
    loadBrandPricing()
  }, [bookingData.manufacturer])
  
  const pricingOptions = [
    {
      type: "same-day" as const,
      price: brandPricing.sameDayPrice,
      description: "Same Day Service",
      subtitle: "Book before midday",
      available: isSameDayEnabled && new Date().getHours() < 12,
      date: new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    },
    {
      type: "next-day" as const,
      price: brandPricing.nextDayPrice,
      description: "Next Day Service",
      subtitle: "Tomorrow",
      available: isNextDayEnabled,
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    },
    {
      type: "standard" as const,
      price: brandPricing.standardPrice,
      description: "Standard Service",
      subtitle: "Within 2-3 days",
      available: true,
      date: "Flexible scheduling",
    },
  ]

  // Filter out same-day and next-day options when disabled
  const availablePricingOptions = pricingOptions.filter(option => {
    if (option.type === "same-day") {
      return isSameDayEnabled
    }
    if (option.type === "next-day") {
      return isNextDayEnabled
    }
    return true
  })

  // Generate standard service date options (7 days starting from day after tomorrow)
  const generateStandardDates = () => {
    const dates = []
    const startDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // Day after tomorrow

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      dates.push({
        value: date.toISOString().split("T")[0],
        label: date.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }),
      })
    }
    return dates
  }

  const updateBookingData = (field: keyof BookingData, value: string) => {
    setBookingData((prev) => ({ ...prev, [field]: value }))
  }

  // Save booking to Supabase using secure server action
  const saveBookingToDatabase = async (): Promise<string | null> => {
    if (!selectedPricing) return null

    try {
      // Use server action for secure validation and sanitization
      const result = await createBooking(
        {
          firstName: bookingData.firstName,
          email: bookingData.email,
          mobile: bookingData.mobile,
          fullAddress: bookingData.fullAddress,
          postcode: bookingData.postcode,
          applianceType: bookingData.applianceType,
          manufacturer: bookingData.manufacturer,
          applianceModel: bookingData.applianceModel,
          applianceFault: bookingData.applianceFault,
          selectedDate: bookingData.selectedDate,
          selectedTimeSlot: bookingData.selectedTimeSlot
        },
        selectedPricing
      )

      if (!result.success) {
        console.error('Error saving booking:', result.error)
        throw new Error(result.error || 'Failed to save booking')
      }

      return result.bookingId || null
    } catch (error) {
      console.error('Database error:', error)
      throw error
    }
  }

  // Send email notification (placeholder for SendGrid integration)
  const sendEmailNotification = async (bookingId: string) => {
    try {
      // This will be replaced with actual SendGrid API call
      const emailData = {
        bookingId,
        customerName: bookingData.firstName,
        customerEmail: bookingData.email,
        serviceType: selectedPricing?.description,
        price: selectedPricing?.price,
        appliance: `${bookingData.manufacturer} ${bookingData.applianceType}`,
        address: bookingData.fullAddress,
        appointmentDate: selectedPricing?.type === 'same-day' ? 'Today' :
                        selectedPricing?.type === 'next-day' ? 'Tomorrow' :
                        bookingData.selectedDate,
        appointmentTime: selectedPricing?.type === 'same-day' ? 'Before 6pm' : bookingData.selectedTimeSlot
      }

           
      // TODO: Replace with actual SendGrid API call
      // const response = await fetch('/api/send-booking-email', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(emailData)
      // })
      
      return true
    } catch (error) {
      console.error('Email notification error:', error)
      // Don't throw - email failure shouldn't block the booking
      return false
    }
  }

  // Loqate address search function
  const searchAddresses = async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([])
      setShowAddressSuggestions(false)
      return
    }

    try {
      // Log Loqate usage for monitoring
      console.log('Loqate Find API called', { 
        source: 'booking-modal',
        timestamp: new Date().toISOString(),
        query: query.substring(0, 3) + '...' // Log partial query for privacy
      })
      
      const response = await fetch(
        `https://api.addressy.com/Capture/Interactive/Find/v1.1/json3.ws?` +
        new URLSearchParams({
          Key: LOQATE_KEY,
          Text: query,
          Countries: "GB",
          Limit: "10",
          Language: "en-gb",
        })
      )

      if (!response.ok) {
        console.error("Loqate API error:", response.status)
        return
      }

      const data = await response.json()
      
      if (data.Items && data.Items.length > 0) {
        const suggestions = data.Items.map((item: LoqateFindResult) => ({
          id: item.Id,
          text: item.Text,
          description: item.Description,
        }))
        
        setAddressSuggestions(suggestions)
        setShowAddressSuggestions(true)
      } else {
        setAddressSuggestions([])
        setShowAddressSuggestions(false)
      }
    } catch (error) {
      console.error("Error searching addresses:", error)
      setAddressSuggestions([])
      setShowAddressSuggestions(false)
    }
  }

  const handleAddressSearch = (value: string) => {
    setAddressSearchValue(value)
    searchAddresses(value)
  }

  const selectAddress = async (suggestion: { id: string; text: string; description: string }) => {
    try {
      // Log Loqate usage for monitoring
      console.log('Loqate Retrieve API called', { 
        source: 'booking-modal',
        timestamp: new Date().toISOString()
      })
      
      const response = await fetch(
        `https://api.addressy.com/Capture/Interactive/Retrieve/v1.1/json3.ws?` +
        new URLSearchParams({
          Key: LOQATE_KEY,
          Id: suggestion.id,
        })
      )

      if (!response.ok) {
        console.error("Loqate Retrieve API error:", response.status)
        return
      }

      const data = await response.json()
      
      if (data.Items && data.Items.length > 0) {
        const addressData = data.Items[0]
                
        const addressParts = [
          addressData.Line1,
          addressData.Line2,
          addressData.Line3,
          addressData.Line4,
          addressData.Line5,
        ].filter(Boolean)
        
             
        const fullAddress = addressParts.join(", ") + (addressData.PostalCode ? `, ${addressData.PostalCode}` : "")
        
        
        setBookingData((prev) => ({
          ...prev,
          address: addressData.Line1 || "",
          fullAddress: fullAddress,
          postcode: addressData.PostalCode || "",
        }))

        setAddressSearchValue(fullAddress)
        setShowAddressSuggestions(false)
        setAddressSuggestions([])
      }
    } catch (error) {
      console.error("Error retrieving address:", error)
      setBookingData((prev) => ({
        ...prev,
        address: suggestion.text,
        fullAddress: `${suggestion.text}, ${suggestion.description}`,
        postcode: "",
      }))
      
      setAddressSearchValue(`${suggestion.text}, ${suggestion.description}`)
      setShowAddressSuggestions(false)
      setAddressSuggestions([])
    }
  }

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
      // Force scroll to top immediately and after render
      const scrollToTop = () => {
        // Try multiple approaches to scroll to top
        const scrollableElements = [
          document.querySelector("[data-radix-dialog-content]"),
          document.querySelector(".overflow-y-auto"),
          document.querySelector("[role='dialog']"),
          document.querySelector(".max-h-\\[85vh\\]"),
          document.querySelector(".max-h-\\[90vh\\]"),
        ].filter(Boolean)

        scrollableElements.forEach((element) => {
          if (element) {
            element.scrollTop = 0
            element.scrollTo({ top: 0, behavior: "auto" })
          }
        })

        // Also scroll the main window
        window.scrollTo({ top: 0, behavior: "auto" })
      }

      // Scroll immediately
      scrollToTop()

      // Scroll after a short delay to ensure DOM updates
      setTimeout(scrollToTop, 50)
      setTimeout(scrollToTop, 150)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      // Force scroll to top immediately and after render
      const scrollToTop = () => {
        // Try multiple approaches to scroll to top
        const scrollableElements = [
          document.querySelector("[data-radix-dialog-content]"),
          document.querySelector(".overflow-y-auto"),
          document.querySelector("[role='dialog']"),
          document.querySelector(".max-h-\\[85vh\\]"),
          document.querySelector(".max-h-\\[90vh\\]"),
        ].filter(Boolean)

        scrollableElements.forEach((element) => {
          if (element) {
            element.scrollTop = 0
            element.scrollTo({ top: 0, behavior: "auto" })
          }
        })

        // Also scroll the main window
        window.scrollTo({ top: 0, behavior: "auto" })
      }

      // Scroll immediately
      scrollToTop()

      // Scroll after a short delay to ensure DOM updates
      setTimeout(scrollToTop, 50)
      setTimeout(scrollToTop, 150)
    }
  }

  const resetForm = () => {
    setCurrentStep(1)
    setAcceptTerms(false)
    setSelectedPricing(null)
    setAddressSearchValue("")
    setAddressSuggestions([])
    setShowAddressSuggestions(false)
    setIsSubmitting(false)
    setApplianceTypeSearch("")
    setApplianceTypeOpen(false)
    setManufacturerSearch("")
    setManufacturerOpen(false)
    setBookingData({
      applianceType: "",
      manufacturer: "",
      mobile: "",
      selectedDate: "",
      selectedTimeSlot: "",
      applianceFault: "",
      applianceModel: "",
      firstName: "",
      surname: "",
      email: "",
      address: "",
      fullAddress: "",
      postcode: "",
      marketingConsent: true,
    })
  }

  const handleSubmit = async () => {
    if (!selectedPricing || isSubmitting) return

    setIsSubmitting(true)

    try {
      // Save booking to database first
      const bookingId = await saveBookingToDatabase()
      
      if (!bookingId) {
        throw new Error('Failed to create booking')
      }

      // Send email notification
      await sendEmailNotification(bookingId)

      // Show success message
      const shortBookingId = bookingId.split('-')[0]
      alert(`Booking confirmed! Booking reference: ${shortBookingId}\n\nYou will receive a confirmation email shortly. Our repair company will contact you to confirm the appointment time.`)
      
      // Close modal and reset
      onClose()
      resetForm()

    } catch (error) {
      console.error('Booking submission error:', error)
      alert('Sorry, there was an error processing your booking. Please try again or contact us directly.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Replace your handleStripePayment function with this:
  const handleStripePayment = async () => {
    if (!selectedPricing || isSubmitting) return

    setIsSubmitting(true)

    try {
      // First save the booking to get an ID
      const bookingId = await saveBookingToDatabase()
      
      if (!bookingId) {
        throw new Error('Failed to create booking')
      }

      // Create Stripe Checkout session instead of payment intent
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: selectedPricing.price * 100, // Convert to pence
          currency: "gbp",
          bookingId: bookingId,
          bookingData: {
            firstName: bookingData.firstName,
            email: bookingData.email,
            serviceType: selectedPricing.type,
            manufacturer: bookingData.manufacturer,
            applianceType: bookingData.applianceType,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Payment setup failed")
      }

      const { sessionId } = await response.json()

      // Redirect to Stripe Checkout
      const stripe = await stripePromise
      if (!stripe) throw new Error("Stripe failed to load")

      const { error } = await stripe.redirectToCheckout({
        sessionId: sessionId,
      })

      if (error) {
        console.error("Stripe checkout error:", error)
        throw new Error(error.message || "Payment redirect failed")
      }

      // User will be redirected to Stripe, then back to success/cancel pages

    } catch (error) {
      console.error("Payment error:", error)
      alert(`Payment failed: ${error.message}\n\nPlease try again or contact support.`)
      setIsSubmitting(false)
    }
  }

  const renderProgressBar = () => {
    const goToStep = (step: number) => {
      // Only allow navigation to completed steps or the next step
      if (step <= currentStep && !isSubmitting) {
        setCurrentStep(step)
        // Force scroll to top immediately and after render
        const scrollToTop = () => {
          // Try multiple approaches to scroll to top
          const scrollableElements = [
            document.querySelector("[data-radix-dialog-content]"),
            document.querySelector(".overflow-y-auto"),
            document.querySelector("[role='dialog']"),
            document.querySelector(".max-h-\\[85vh\\]"),
            document.querySelector(".max-h-\\[90vh\\]"),
          ].filter(Boolean)

          scrollableElements.forEach((element) => {
            if (element) {
              element.scrollTop = 0
              element.scrollTo({ top: 0, behavior: "auto" })
            }
          })

          // Also scroll the main window
          window.scrollTo({ top: 0, behavior: "auto" })
        }

        // Scroll immediately
        scrollToTop()

        // Scroll after a short delay to ensure DOM updates
        setTimeout(scrollToTop, 50)
        setTimeout(scrollToTop, 150)
      }
    }

    return (
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div className="flex items-center flex-1">
          {/* Step 1 - Appliance */}
          <div
            className={`flex items-center cursor-pointer transition-colors ${
              currentStep >= 1 ? "text-green-600 hover:text-green-700" : "text-gray-400"
            } ${isSubmitting ? "pointer-events-none" : ""}`}
            onClick={() => goToStep(1)}
          >
            <div className={`w-2 sm:w-3 h-1 ${currentStep >= 1 ? "bg-green-600" : "bg-gray-300"} mr-1 sm:mr-2`} />
            <span className="text-xs sm:text-sm font-medium">Appliance</span>
          </div>

          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 mx-2 sm:mx-4" />

          {/* Step 2 - Appointment */}
          <div
            className={`flex items-center transition-colors ${
              currentStep >= 2
                ? "text-green-600 hover:text-green-700 cursor-pointer"
                : "text-gray-400 cursor-pointer hover:text-gray-600"
            } ${isSubmitting ? "pointer-events-none" : ""}`}
            onClick={() => goToStep(2)}
          >
            <div className={`w-2 sm:w-3 h-1 ${currentStep >= 2 ? "bg-green-600" : "bg-gray-300"} mr-1 sm:mr-2`} />
            <span className="text-xs sm:text-sm font-medium">Appointment</span>
          </div>

          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 mx-2 sm:mx-4" />

          {/* Step 3 - Details */}
          <div
            className={`flex items-center transition-colors ${
              currentStep >= 3
                ? "text-green-600 hover:text-green-700 cursor-pointer"
                : "text-gray-400 cursor-pointer hover:text-gray-600"
            } ${isSubmitting ? "pointer-events-none" : ""}`}
            onClick={() => goToStep(3)}
          >
            <div className={`w-2 sm:w-3 h-1 ${currentStep >= 3 ? "bg-green-600" : "bg-gray-300"} mr-1 sm:mr-2`} />
            <span className="text-xs sm:text-sm font-medium">Details</span>
          </div>

          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 mx-2 sm:mx-4" />

          {/* Step 4 - Confirm */}
          <div
            className={`flex items-center transition-colors ${
              currentStep >= 4
                ? "text-green-600 hover:text-green-700 cursor-pointer"
                : "text-gray-400 cursor-pointer hover:text-gray-600"
            } ${isSubmitting ? "pointer-events-none" : ""}`}
            onClick={() => goToStep(4)}
          >
            <div className={`w-2 sm:w-3 h-1 ${currentStep >= 4 ? "bg-green-600" : "bg-gray-300"} mr-1 sm:mr-2`} />
            <span className="text-xs sm:text-sm font-medium">Confirm</span>
          </div>
        </div>
      </div>
    )
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">1. Your Appliance</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <Select
              value={bookingData.applianceType}
              onValueChange={(value) => setBookingData(prev => ({ ...prev, applianceType: value }))}
              disabled={isSubmitting || isLoadingApplianceTypes}
            >
              <SelectTrigger className="w-full text-base">
                <SelectValue placeholder={isLoadingApplianceTypes ? "Loading categories..." : "Select appliance category"} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {applianceTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Brand <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                type="text"
                placeholder="Type brand (e.g., Bosch)"
                value={manufacturerSearch}
                onChange={(e) => {
                  setManufacturerSearch(e.target.value)
                  setBookingData(prev => ({ ...prev, manufacturer: "" }))
                  if (e.target.value.length > 0) {
                    setManufacturerOpen(true)
                  }
                }}
                onFocus={() => manufacturerSearch.length > 0 && setManufacturerOpen(true)}
                onBlur={() => setTimeout(() => setManufacturerOpen(false), 200)}
                className="w-full text-base"
                disabled={isSubmitting}
              />
              
              {/* Autocomplete dropdown */}
              {manufacturerOpen && manufacturerSearch.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-[200px] overflow-auto">
                  {manufacturers
                    .filter(brand => brand.toLowerCase().includes(manufacturerSearch.toLowerCase()))
                    .map((brand) => (
                      <div
                        key={brand}
                        className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setBookingData(prev => ({ ...prev, manufacturer: brand }))
                          setManufacturerSearch(brand)
                          setManufacturerOpen(false)
                        }}
                      >
                        {brand}
                      </div>
                    ))}
                  {manufacturers.filter(brand => brand.toLowerCase().includes(manufacturerSearch.toLowerCase())).length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500">No matching manufacturers</div>
                  )}
                </div>
              )}
            </div>
            {bookingData.manufacturer && (
              <p className="text-xs text-green-600 mt-1">✓ Selected: {bookingData.manufacturer}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Appliance Fault <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={bookingData.applianceFault}
              onChange={(e) => updateBookingData("applianceFault", e.target.value)}
              placeholder="Describe the problem with your appliance..."
              className="w-full min-h-[80px] text-base"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Appliance Model:</label>
            <Input
              value={bookingData.applianceModel}
              onChange={(e) => updateBookingData("applianceModel", e.target.value)}
              placeholder="Model name if known"
              className="w-full text-base"
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={nextStep}
          className="bg-green-600 hover:bg-green-700 w-full"
          disabled={!bookingData.applianceType || !bookingData.manufacturer || !bookingData.applianceFault || isSubmitting}
        >
          Continue
        </Button>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">2. Select Service & Appointment</h2>
        <p className="text-gray-600 mb-6">
          Choose your preferred service speed and appointment time. All prices include call-out, diagnosis, and repair.
        </p>

        <div className="space-y-4">
          {availablePricingOptions.map((option) => (
            <div
              key={option.type}
              className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedPricing?.type === option.type
                  ? "border-green-500 bg-green-50"
                  : option.available
                    ? "border-gray-200 hover:border-green-300"
                    : "border-gray-100 bg-gray-50 cursor-not-allowed opacity-60"
              } ${isSubmitting ? "pointer-events-none" : ""}`}
              onClick={() => {
                if (option.available && !isSubmitting) {
                  setSelectedPricing(option)
                  // Reset date and time selections when changing service type
                  updateBookingData("selectedDate", "")
                  updateBookingData("selectedTimeSlot", "")
                }
              }}
            >
              {!option.available && (
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="text-xs">
                    Not Available
                  </Badge>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${
                        selectedPricing?.type === option.type ? "border-green-500 bg-green-500" : "border-gray-300"
                      }`}
                    >
                      {selectedPricing?.type === option.type && (
                        <div className="w-full h-full rounded-full bg-white scale-50"></div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{option.description}</h3>
                      <p className="text-sm text-gray-600">{option.subtitle}</p>
                      <p className="text-sm text-gray-500">{option.date}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">£{option.price}</div>
                  <div className="text-xs text-gray-500">inc. VAT</div>
                </div>
              </div>

              {option.type === "same-day" && option.available && (
                <div className="mt-2 p-2 bg-orange-100 rounded text-xs text-orange-700">
                  ⏰ Book before midday for same-day service
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Date and Time Selection */}
        {selectedPricing && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
            <h4 className="font-medium text-blue-900">Select Your Appointment Time</h4>

            {selectedPricing.type === "same-day" && (
              <div className="space-y-3">
                <p className="text-sm text-blue-800">
                  <strong>Today ({selectedPricing.date})</strong> - Available before 6pm
                </p>
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <p className="text-sm text-green-800">
                    ✓ Engineer will arrive today before 6pm. Exact 3-hour time slot will be confirmed via SMS.
                  </p>
                </div>
              </div>
            )}

            {selectedPricing.type === "next-day" && (
              <div className="space-y-3">
                <p className="text-sm text-blue-800">
                  <strong>Tomorrow ({selectedPricing.date})</strong>
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Time <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={bookingData.selectedTimeSlot}
                    onValueChange={(value) => updateBookingData("selectedTimeSlot", value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-full text-base">
                      <SelectValue placeholder="Select time preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">Morning (AM) - 8am to 1pm</SelectItem>
                      <SelectItem value="PM">Afternoon (PM) - 1pm to 6pm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {selectedPricing.type === "standard" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Date <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={bookingData.selectedDate}
                    onValueChange={(value) => updateBookingData("selectedDate", value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-full text-base">
                      <SelectValue placeholder="Choose your preferred date" />
                    </SelectTrigger>
                    <SelectContent>
                      {generateStandardDates().map((date) => (
                        <SelectItem key={date.value} value={date.value}>
                          {date.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {bookingData.selectedDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Time <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={bookingData.selectedTimeSlot}
                      onValueChange={(value) => updateBookingData("selectedTimeSlot", value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="w-full text-base">
                        <SelectValue placeholder="Select time preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">Morning (AM) - 8am to 1pm</SelectItem>
                        <SelectItem value="PM">Afternoon (PM) - 1pm to 6pm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">What's Included:</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Professional diagnosis of your appliance</li>
            <li>• Repair work and replacement parts</li>
            <li>• 1-year warranty on all work</li>
            <li>• No hidden fees or call-out charges</li>
          </ul>
        </div>

        </div>
      
      <div className="flex justify-end">
        <Button
          onClick={nextStep}
          className="bg-green-600 hover:bg-green-700 w-full"
          disabled={
            !selectedPricing ||
            (selectedPricing.type === "next-day" && !bookingData.selectedTimeSlot) ||
            (selectedPricing.type === "standard" && (!bookingData.selectedDate || !bookingData.selectedTimeSlot)) ||
            isSubmitting
          }
        >
          Continue to Details
        </Button>
      </div>
      
      <div className="flex justify-end mt-3">
        <Button
          variant="outline"
          className="w-full border-green-600 text-green-600 hover:bg-green-50"
          onClick={prevStep}
          disabled={isSubmitting}
        >
          {"<"} Change Appliance Details
        </Button>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Full Name: <span className="text-red-500">*</span>
        </label>
        <Input
          value={bookingData.firstName}
          onChange={(e) => updateBookingData("firstName", e.target.value)}
          placeholder="Enter your full name"
          className="w-full text-base"
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-4 mt-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mobile: <span className="text-red-500">*</span>
          </label>
          <Input
            value={bookingData.mobile}
            onChange={(e) => updateBookingData("mobile", e.target.value)}
            className="w-full text-base"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email: <span className="text-red-500">*</span>
          </label>
          <Input
            type="email"
            value={bookingData.email}
            onChange={(e) => updateBookingData("email", e.target.value)}
            className="w-full text-base"
            disabled={isSubmitting}
          />
        </div>

        <div className="flex items-start gap-2">
          <Checkbox 
            id="marketing-consent-booking" 
            defaultChecked={true} 
            className="mt-1" 
            disabled={isSubmitting}
          />
          <label htmlFor="marketing-consent-booking" className="text-xs text-gray-600 cursor-pointer">
            I would like to receive helpful tips, special offers, and updates about appliance maintenance and repair
            services via email. You can unsubscribe at any time.
          </label>
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Address: <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Input
              value={addressSearchValue}
              onChange={(e) => handleAddressSearch(e.target.value)}
              placeholder="Start typing your address..."
              className="w-full text-base pr-10"
              disabled={isSubmitting}
            />
            <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>

          {/* Address Suggestions Dropdown */}
          {showAddressSuggestions && addressSuggestions.length > 0 && !isSubmitting && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {addressSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  onClick={() => selectAddress(suggestion)}
                >
                  <div className="font-medium text-sm text-gray-900">{suggestion.text}</div>
                  <div className="text-xs text-gray-500">{suggestion.description}</div>
                </div>
              ))}
            </div>
          )}

          {/* Selected Address Display */}
          {bookingData.fullAddress && !showAddressSuggestions && (
            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800">Address confirmed:</p>
                  <p className="text-sm text-green-700">{bookingData.fullAddress}</p>
                  {!isSubmitting && (
                    <button
                      type="button"
                      onClick={() => {
                        setAddressSearchValue("")
                        setBookingData((prev) => ({ ...prev, address: "", fullAddress: "", postcode: "" }))
                      }}
                      className="text-xs text-green-600 hover:text-green-700 underline mt-1"
                    >
                      Change address
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-6">
        <Button
          onClick={nextStep}
          className="bg-green-600 hover:bg-green-700"
          disabled={!bookingData.firstName || !bookingData.email || !bookingData.mobile || !bookingData.fullAddress || isSubmitting}
        >
          Continue & Review
        </Button>

        <Button 
          variant="outline" 
          className="border-green-600 text-green-600 hover:bg-green-50" 
          onClick={prevStep}
          disabled={isSubmitting}
        >
          {"<"} Change Details
        </Button>
      </div>
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">4. Payment & Confirmation</h2>
        <p className="text-gray-600 mb-6">Review your booking and complete payment to confirm your appointment.</p>

        <div className="space-y-6">
          {/* Service & Pricing Summary */}
          <Card className="border-2 border-green-200 bg-green-50">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-600" />
                Service Summary
              </h3>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="font-medium text-lg">{selectedPricing?.description}</p>
                  <p className="text-sm text-gray-600">{selectedPricing?.subtitle}</p>
                  {selectedPricing?.type === "same-day" && <p className="text-sm text-green-700">Today before 6pm</p>}
                  {selectedPricing?.type === "next-day" && bookingData.selectedTimeSlot && (
                    <p className="text-sm text-green-700">
                      Tomorrow {bookingData.selectedTimeSlot === "AM" ? "Morning" : "Afternoon"}
                    </p>
                  )}
                  {selectedPricing?.type === "standard" && bookingData.selectedDate && bookingData.selectedTimeSlot && (
                    <p className="text-sm text-green-700">
                      {new Date(bookingData.selectedDate).toLocaleDateString("en-GB", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}{" "}
                      {bookingData.selectedTimeSlot === "AM" ? "Morning" : "Afternoon"}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-green-600">£{selectedPricing?.price}</p>
                  <p className="text-sm text-gray-500">inc. VAT</p>
                </div>
              </div>
              <div className="bg-white/70 p-3 rounded border">
                <p className="text-sm text-gray-700">
                  <strong>What's included:</strong> Professional diagnosis, repair work, replacement parts, and 1-year
                  warranty
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Appliance Details */}
          <Card className="border-2 border-blue-200">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                Appliance Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Type:</span>
                  <p className="font-medium">{bookingData.applianceType}</p>
                </div>
                <div>
                  <span className="text-gray-600">Manufacturer:</span>
                  <p className="font-medium">{bookingData.manufacturer}</p>
                </div>
                {bookingData.applianceModel && (
                  <div className="col-span-2">
                    <span className="text-gray-600">Model:</span>
                    <p className="font-medium">{bookingData.applianceModel}</p>
                  </div>
                )}
                {bookingData.applianceFault && (
                  <div className="col-span-2">
                    <span className="text-gray-600">Fault Description:</span>
                    <p className="font-medium">{bookingData.applianceFault}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Personal Details */}
          <Card className="border-2 border-gray-200">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-gray-600" />
                Your Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <p className="font-medium">{bookingData.firstName}</p>
                </div>
                <div>
                  <span className="text-gray-600">Email:</span>
                  <p className="font-medium">{bookingData.email}</p>
                </div>
                <div>
                  <span className="text-gray-600">Mobile:</span>
                  <p className="font-medium">{bookingData.mobile}</p>
                </div>
                <div>
                  <span className="text-gray-600">Address:</span>
                  <p className="font-medium">{bookingData.fullAddress}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Terms and Conditions */}
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <Checkbox
              id="terms"
              checked={acceptTerms}
              onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
              className="mt-1"
              disabled={isSubmitting}
            />
            <label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer">
              I agree to the{" "}
              <a href="#" className="text-green-600 hover:underline">
                Terms and Conditions
              </a>{" "}
              and{" "}
              <a href="#" className="text-green-600 hover:underline">
                Privacy Policy
              </a>
              . I understand that payment will be processed securely via Stripe.
            </label>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleStripePayment}
              className="bg-green-600 hover:bg-green-700 text-lg py-4 font-semibold"
              disabled={!acceptTerms || isSubmitting}
            >
              {isSubmitting ? "Processing..." : `Pay £${selectedPricing?.price} & Confirm Booking`}
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <span>🔒 Secure payment powered by</span>
              <span className="font-semibold">Stripe</span>
            </div>

            <Button 
              variant="outline" 
              className="border-green-600 text-green-600 hover:bg-green-50" 
              onClick={prevStep}
              disabled={isSubmitting}
            >
              {"<"} Back to Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderBookingSummary = () => (
    <div className="bg-gray-50 p-6 rounded-lg">
      <h3 className="font-bold text-gray-900 mb-4">YOUR BOOKING</h3>

      <div className="space-y-3">
        {selectedPricing && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-semibold">{selectedPricing.description}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">£{selectedPricing.price}</p>
              <p className="text-xs text-gray-600">{selectedPricing.subtitle}</p>
              {selectedPricing.type === "same-day" && <p className="text-xs text-green-700 mt-1">Today before 6pm</p>}
              {selectedPricing.type === "next-day" && bookingData.selectedTimeSlot && (
                <p className="text-xs text-green-700 mt-1">
                  Tomorrow {bookingData.selectedTimeSlot === "AM" ? "Morning" : "Afternoon"}
                </p>
              )}
              {selectedPricing.type === "standard" && bookingData.selectedDate && bookingData.selectedTimeSlot && (
                <p className="text-xs text-green-700 mt-1">
                  {new Date(bookingData.selectedDate).toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  {bookingData.selectedTimeSlot === "AM" ? "AM" : "PM"}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {bookingData.applianceType && bookingData.manufacturer && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="font-medium">
                  {bookingData.manufacturer} / {bookingData.applianceType}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium">Professional diagnosis & repair included</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium">1-year warranty on all work</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-5xl w-full max-h-[85vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="sr-only">Book Engineer Appointment</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          <div className="lg:col-span-2">
            {renderProgressBar()}

            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
          </div>

          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-0">
              {currentStep === 1 && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-gray-900 mb-4">Call-out &amp; Repair</h3>
                    <p className="text-gray-700 mb-4">
                      Price includes our appliance expert to diagnose the problem, and replace any parts that may be
                      required subject to Terms and conditions.
                    </p>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">3 hour time-slot included</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {(currentStep === 2 || currentStep === 3) && renderBookingSummary()}

              {currentStep === 4 && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-gray-900 mb-4">Ready to Confirm</h3>
                    <p className="text-gray-700 mb-4">
                      Review your booking details and confirm to schedule your engineer appointment.
                    </p>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">£{selectedPricing?.price}</p>
                      <p className="text-sm text-gray-600">Payment on completion</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// booking-form.tsx
"use client"

import { useState, useEffect } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Clock, CheckCircle, Calendar, ChevronRight, User, MapPin, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { supabase } from "@/lib/supabase"
import type { Booking } from "@/lib/supabase"
import { getBookingApplianceTypes, getBookingBrands } from "@/actions/get-booking-options"

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

const LOQATE_KEY = process.env.NEXT_PUBLIC_LOQATE_KEY || ""

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

export function BookingForm() {
  // State for accordion-based form
  const [openSections, setOpenSections] = useState(["step-1"]) // Start with first section open
  const [completedSections, setCompletedSections] = useState<string[]>([])
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isWidget, setIsWidget] = useState(false)
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

  // Autocomplete states for Appliance Type and Manufacturer
  const [applianceTypeSearch, setApplianceTypeSearch] = useState("")
  const [applianceTypeOpen, setApplianceTypeOpen] = useState(false)
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

  // Check if we're in widget mode
  useEffect(() => {
    // Check if we're on the widget path or in an iframe
    const isWidgetPath = window.location.pathname.includes('/widget/booking')
    const isInIframe = window.self !== window.top
    const widgetMode = isWidgetPath || isInIframe
    setIsWidget(widgetMode)
    
    // Add widget-mode class for iframe-specific styling
    if (widgetMode) {
      document.documentElement.classList.add('widget-mode')
      document.body.classList.add('widget-mode')
      
      // Only hide vertical scroll if the content fits in the iframe
      const checkContentHeight = () => {
        const contentHeight = document.documentElement.scrollHeight
        const viewportHeight = window.innerHeight
        
        // If content is much larger than viewport, allow scrolling
        if (contentHeight > viewportHeight + 100) {
          document.body.style.overflowY = 'auto'
          document.documentElement.style.overflowY = 'auto'
        }
      }
      
      // Check height after initial render and when content changes
      setTimeout(checkContentHeight, 100)
    }
    
    return () => {
      document.documentElement.classList.remove('widget-mode')
      document.body.classList.remove('widget-mode')
      // Reset overflow styles
      document.body.style.overflowY = ''
      document.documentElement.style.overflowY = ''
    }
  }, [])

  // Send height updates to parent when in iframe
  useEffect(() => {
    if (!isWidget) return

    let lastHeight = 0
    
    const sendHeight = () => {
      // Use the main container height instead of body to avoid feedback loops
      const container = document.querySelector('.booking-form-container')
      let height = 0
      
      const isMobile = window.innerWidth <= 768
      
      if (container) {
        // Get the container's total height including margins
        const rect = container.getBoundingClientRect()
        const styles = window.getComputedStyle(container)
        const marginTop = parseFloat(styles.marginTop) || 0
        const marginBottom = parseFloat(styles.marginBottom) || 0
        height = rect.height + marginTop + marginBottom
        
        // Add the container's offset from top of page
        height += container.offsetTop
        
        // On mobile, also try alternative height calculations
        if (isMobile) {
          const scrollHeight = container.scrollHeight
          const offsetHeight = container.offsetHeight
          const alternativeHeight = Math.max(height, scrollHeight, offsetHeight)
          if (alternativeHeight > height) {
            height = alternativeHeight
          }
        }
      } else {
        height = document.documentElement.scrollHeight
      }
      
      // Add extra padding for mobile devices
      const extraPadding = isMobile ? 40 : 20
      height += extraPadding
      
      // On mobile, be more aggressive with sending updates
      const threshold = isMobile ? 1 : 10
      const shouldSend = isMobile ? true : Math.abs(height - lastHeight) > threshold
      
      if (shouldSend && height > 0) {
        lastHeight = height
        console.log('Sending height:', height, 'Mobile:', isMobile, 'Container found:', !!container) // Debug log
        
        // Try multiple ways to send the message for mobile compatibility
        try {
          window.parent.postMessage({
            type: 'rs-repairs-booking-height',
            height: height,
            timestamp: Date.now(),
            mobile: isMobile
          }, '*')
          
          // For mobile, send a second message after a brief delay
          if (isMobile) {
            setTimeout(() => {
              window.parent.postMessage({
                type: 'rs-repairs-booking-height',
                height: height,
                timestamp: Date.now(),
                mobile: isMobile,
                retry: true
              }, '*')
            }, 50)
          }
        } catch (e) {
          console.error('Failed to send height message:', e)
        }
      }
    }

    // Send initial height after multiple delays for mobile
    setTimeout(sendHeight, 100)
    setTimeout(sendHeight, 500)  // Additional delay for mobile
    setTimeout(sendHeight, 1000) // Even longer delay for mobile rendering
    
    // Also send height on orientation change (mobile)
    const handleOrientationChange = () => {
      setTimeout(sendHeight, 100)
    }
    window.addEventListener('orientationchange', handleOrientationChange)
    window.addEventListener('resize', handleOrientationChange)

    // Watch for changes with debouncing
    let timeoutId
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(sendHeight, 100)
    })

    // Observe the main container instead of body
    const container = document.querySelector('.booking-form-container')
    if (container) {
      resizeObserver.observe(container)
    }

    // For mobile, also observe viewport changes
    const viewportObserver = new ResizeObserver(() => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(sendHeight, 200)
    })
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        setTimeout(sendHeight, 100)
      })
    }

    return () => {
      resizeObserver.disconnect()
      clearTimeout(timeoutId)
      window.removeEventListener('orientationchange', handleOrientationChange)
      window.removeEventListener('resize', handleOrientationChange)
    }
  }, [isWidget, openSections, completedSections]) // Re-run when sections change

  // Load appliance types on mount
  useEffect(() => {
    const loadApplianceTypes = async () => {
      setIsLoadingApplianceTypes(true)
      try {
        const types = await getBookingApplianceTypes()
        setApplianceTypes(types)
      } catch (error) {
        console.error('Error loading appliance types:', error)
      } finally {
        setIsLoadingApplianceTypes(false)
      }
    }

    loadApplianceTypes()
  }, [])

  // Load manufacturers when appliance type changes
  useEffect(() => {
    const loadManufacturers = async () => {
      if (!bookingData.applianceType) {
        setManufacturers([])
        setBookingData(prev => ({ ...prev, manufacturer: "" }))
        setManufacturerSearch("")
        return
      }

      setIsLoadingManufacturers(true)
      try {
        const brands = await getBookingBrands(bookingData.applianceType)
        setManufacturers(brands)
        // Reset manufacturer if it's not in the new list
        if (bookingData.manufacturer && !brands.includes(bookingData.manufacturer)) {
          setBookingData(prev => ({ ...prev, manufacturer: "" }))
          setManufacturerSearch("")
        }
      } catch (error) {
        console.error('Error loading manufacturers:', error)
      } finally {
        setIsLoadingManufacturers(false)
      }
    }

    loadManufacturers()
  }, [bookingData.applianceType])

  // Add updateBookingData function
  const updateBookingData = (field: keyof BookingData, value: string) => {
    setBookingData((prev) => ({ ...prev, [field]: value }))
  }

  // Function to complete a section and open the next one
  const completeSection = (currentSection: string, nextSection?: string) => {
    setCompletedSections(prev => {
      if (!prev.includes(currentSection)) {
        return [...prev, currentSection]
      }
      return prev
    })
    
    if (nextSection) {
      setOpenSections([nextSection])
      // Scroll to next section after a brief delay
      setTimeout(() => {
        const nextElement = document.querySelector(`[data-section="${nextSection}"]`)
        if (nextElement) {
          nextElement.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      }, 100)
    }
  }

  // Validation functions for each section
  const isStep1Valid = () => {
    return bookingData.applianceType && bookingData.manufacturer && bookingData.applianceFault
  }

  const isStep2Valid = () => {
    if (!selectedPricing) return false
    if (selectedPricing.type === "next-day" && !bookingData.selectedTimeSlot) return false
    if (selectedPricing.type === "standard" && (!bookingData.selectedDate || !bookingData.selectedTimeSlot)) return false
    return true
  }

  const isStep3Valid = () => {
    return bookingData.firstName && bookingData.email && bookingData.mobile && bookingData.fullAddress
  }

  // Add pricingOptions array
  const pricingOptions = [
    {
      type: "same-day" as const,
      price: 149,
      description: "Same Day Service",
      subtitle: "Book before midday",
      available: new Date().getHours() < 12,
      date: new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    },
    {
      type: "next-day" as const,
      price: 129,
      description: "Next Day Service",
      subtitle: "Tomorrow",
      available: true,
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    },
    {
      type: "standard" as const,
      price: 109,
      description: "Standard Service",
      subtitle: "Within 2-3 days",
      available: true,
      date: "Flexible scheduling",
    },
  ]

  // Add generateStandardDates function
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

  // Handle accordion value changes
  const handleAccordionChange = (value: string[]) => {
    setOpenSections(value)
  }

  // Add searchAddresses function
  const searchAddresses = async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([])
      setShowAddressSuggestions(false)
      return
    }
    try {
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

  // Add handleAddressSearch function
  const handleAddressSearch = (value: string) => {
    setAddressSearchValue(value)
    searchAddresses(value)
  }

  // Add selectAddress function
  const selectAddress = async (suggestion: { id: string; text: string; description: string }) => {
    try {
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
        const addressData: LoqateRetrieveResult = data.Items[0]
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

  // Add saveBookingToDatabase function
  const saveBookingToDatabase = async (): Promise<string | null> => {
    if (!selectedPricing) return null
    try {
      // Prepare booking data for database
      const bookingRecord = {
        full_name: bookingData.firstName,
        email: bookingData.email,
        mobile: bookingData.mobile,
        address: bookingData.fullAddress,
        appliance_type: bookingData.applianceType,
        manufacturer: bookingData.manufacturer,
        model: bookingData.applianceModel || null,
        fault_description: bookingData.applianceFault,
        service_type: selectedPricing.type === 'same-day' ? 'same_day' : 
                     selectedPricing.type === 'next-day' ? 'next_day' : 'standard',
        service_price: selectedPricing.price * 100, // Convert to pence
        appointment_date: selectedPricing.type === 'same-day' ? new Date().toISOString().split('T')[0] :
                         selectedPricing.type === 'next-day' ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] :
                         bookingData.selectedDate || null,
        appointment_time: selectedPricing.type === 'same-day' ? 'Before 6pm' : bookingData.selectedTimeSlot || null,
        payment_status: 'pending',
        booking_status: 'pending_payment'
      }
      // Insert booking into Supabase
      const { data, error } = await supabase
        .from('bookings')
        .insert([bookingRecord])
        .select()
        .single()
      if (error) {
        console.error('Error saving booking:', error)
        throw new Error('Failed to save booking')
      }
      return data.id
    } catch (error) {
      console.error('Database error:', error)
      throw error
    }
  }

  // Add handleStripePayment function
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
          isWidget: isWidget,
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
    } catch (error: any) {
      console.error("Payment error:", error)
      alert(`Payment failed: ${error.message}\n\nPlease try again or contact support.`)
      setIsSubmitting(false)
    }
  }

  // --- Render Functions ---

  const renderSectionHeader = (title: string, isCompleted: boolean, stepNumber: number) => {
    return (
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isCompleted ? "bg-green-600 text-white" : "bg-gray-200 text-gray-600"
        }`}>
          {isCompleted ? <Check className="w-4 h-4" /> : stepNumber}
        </div>
        <span className="text-lg font-semibold">{title}</span>
      </div>
    )
  }

  // --- Step 1 ---
  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                type="text"
                placeholder="Type Category e.g., Washing Machine"
                value={applianceTypeSearch}
                onChange={(e) => {
                  setApplianceTypeSearch(e.target.value)
                  setBookingData(prev => ({ ...prev, applianceType: "" }))
                  if (e.target.value.length > 0) {
                    setApplianceTypeOpen(true)
                  }
                }}
                onFocus={() => applianceTypeSearch.length > 0 && setApplianceTypeOpen(true)}
                onBlur={() => setTimeout(() => setApplianceTypeOpen(false), 200)}
                className="w-full text-base"
                disabled={isSubmitting}
              />
              {applianceTypeOpen && applianceTypeSearch.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-[200px] overflow-auto">
                  {applianceTypes
                    .filter(type => type.toLowerCase().includes(applianceTypeSearch.toLowerCase()))
                    .map((type) => (
                      <div
                        key={type}
                        className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setBookingData(prev => ({ ...prev, applianceType: type }))
                          setApplianceTypeSearch(type)
                          setApplianceTypeOpen(false)
                        }}
                      >
                        {type}
                      </div>
                    ))}
                  {applianceTypes.filter(type => type.toLowerCase().includes(applianceTypeSearch.toLowerCase())).length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500">No matching appliance types</div>
                  )}
                </div>
              )}
            </div>
            {bookingData.applianceType && (
              <p className="text-xs text-green-600 mt-1">✓ Selected: {bookingData.applianceType}</p>
            )}
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
          onClick={() => completeSection("step-1", "step-2")}
          className="bg-green-600 hover:bg-green-700 w-full"
          disabled={!isStep1Valid() || isSubmitting}
        >
          Continue to Service Selection
        </Button>
      </div>
    </div>
  )

  // --- Step 2 ---
  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <p className="text-gray-600 mb-6">
          Choose your preferred service speed and appointment time. All prices include call-out, diagnosis, and repair.
        </p>
        <div className="space-y-4">
          {pricingOptions.map((option) => (
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
          onClick={() => completeSection("step-2", "step-3")}
          className="bg-green-600 hover:bg-green-700 w-full"
          disabled={!isStep2Valid() || isSubmitting}
        >
          Continue to Your Details
        </Button>
      </div>
    </div>
  )

  // --- Step 3 ---
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
            {showAddressSuggestions && addressSuggestions.length > 0 && !isSubmitting && (
              <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto" style={{ zIndex: 99999 }}>
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
          </div>
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
      <div className="flex justify-end mt-6">
        <Button
          onClick={() => completeSection("step-3", "step-4")}
          className="bg-green-600 hover:bg-green-700 w-full"
          disabled={!isStep3Valid() || isSubmitting}
        >
          Continue to Payment
        </Button>
      </div>
    </div>
  )

  // --- Step 4 ---
  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <p className="text-gray-600 mb-6">Review your booking and complete payment to confirm your appointment.</p>
        <div className="space-y-6">
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
              </a>.
              I understand that payment will be processed securely via Stripe.
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
          </div>
        </div>
      </div>
    </div>
  )

  // Instead of Dialog, render the form directly:
  return (
    <div className="booking-form-container w-full max-w-4xl mx-auto" data-widget="true">
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Engineer Booking Form</h1>
          <p className="text-gray-600">Complete the sections below to book your appliance repair</p>
        </div>
        
        <Accordion 
          type="multiple" 
          value={openSections} 
          onValueChange={handleAccordionChange}
          className="space-y-4"
        >
          <AccordionItem value="step-1" className="border rounded-lg" data-section="step-1">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              {renderSectionHeader("Your Appliance", completedSections.includes("step-1"), 1)}
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              {renderStep1()}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step-2" className="border rounded-lg" data-section="step-2">
            <AccordionTrigger 
              className="px-6 py-4 hover:no-underline"
              disabled={!completedSections.includes("step-1")}
            >
              {renderSectionHeader("Service & Appointment", completedSections.includes("step-2"), 2)}
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              {renderStep2()}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step-3" className="border rounded-lg overflow-visible" data-section="step-3">
            <AccordionTrigger 
              className="px-6 py-4 hover:no-underline"
              disabled={!completedSections.includes("step-2")}
            >
              {renderSectionHeader("Your Details", completedSections.includes("step-3"), 3)}
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 overflow-visible">
              {renderStep3()}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step-4" className="border rounded-lg" data-section="step-4">
            <AccordionTrigger 
              className="px-6 py-4 hover:no-underline"
              disabled={!completedSections.includes("step-3")}
            >
              {renderSectionHeader("Payment & Confirmation", completedSections.includes("step-4"), 4)}
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              {renderStep4()}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  )
} 
// booking-form.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
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
import { getRepairBookingCategories, getRepairBookingBrands, getRepairBrandPrice } from "@/actions/get-repair-booking-options"
import { createBooking } from "@/actions/create-booking"
import { validateEmail, validateUKMobile, validateName, validateTextField } from "@/lib/validation"

// Loqate interfaces
interface LoqateFindResult {
  Id: string
  Type: string
  Text: string
  Highlight: string
  Description: string
}

// Loqate API proxy endpoint
const ADDRESS_LOOKUP_ENDPOINT = "/api/address-lookup"

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

// Loqate key removed - now using server-side proxy for security

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
  const addressInputRef = useRef<HTMLInputElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
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
  
  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

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
          // Get allowed origins from environment or use defaults
          const allowedOrigins = [
            window.location.origin,
            'https://www.ransomspares.co.uk',
            'https://ransomspares.co.uk',
            process.env.NEXT_PUBLIC_APP_URL
          ].filter(Boolean)
          
          // Try to detect parent origin from document.referrer
          let targetOrigin = '*'
          if (document.referrer) {
            try {
              const referrerUrl = new URL(document.referrer)
              if (allowedOrigins.includes(referrerUrl.origin)) {
                targetOrigin = referrerUrl.origin
              }
            } catch (e) {
              // Invalid referrer URL, use wildcard
            }
          }
          
          window.parent.postMessage({
            type: 'rs-repairs-booking-height',
            height: height,
            timestamp: Date.now(),
            mobile: isMobile
          }, targetOrigin)
          
          // For mobile, send a second message after a brief delay
          if (isMobile) {
            setTimeout(() => {
              window.parent.postMessage({
                type: 'rs-repairs-booking-height',
                height: height,
                timestamp: Date.now(),
                mobile: isMobile,
                retry: true
              }, targetOrigin)
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

  // Add updateBookingData function
  const updateBookingData = (field: keyof BookingData, value: string) => {
    setBookingData((prev) => ({ ...prev, [field]: value }))
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }
  
  // Validate field on blur
  const validateField = (fieldName: keyof BookingData) => {
    let error = ''
    
    switch (fieldName) {
      case 'manufacturer':
        const brandValidation = validateTextField(bookingData.manufacturer, 'Brand', 2, 50)
        if (!brandValidation.isValid && bookingData.manufacturer) {
          error = brandValidation.errors[0]
        }
        break
      
      case 'applianceFault':
        const faultValidation = validateTextField(bookingData.applianceFault, 'Fault description', 10, 500)
        if (!faultValidation.isValid) {
          error = faultValidation.errors[0]
        }
        break
      
      case 'firstName':
        const nameValidation = validateName(bookingData.firstName, 'Full name')
        if (!nameValidation.isValid) {
          error = nameValidation.errors[0]
        }
        break
      
      case 'mobile':
        const mobileValidation = validateUKMobile(bookingData.mobile)
        if (!mobileValidation.isValid && bookingData.mobile) {
          error = mobileValidation.errors[0]
        }
        break
      
      case 'email':
        const emailValidation = validateEmail(bookingData.email)
        if (!emailValidation.isValid && bookingData.email) {
          error = emailValidation.errors[0]
        }
        break
      
      case 'address':
        if (!bookingData.fullAddress) {
          error = 'Please select an address from the suggestions'
        }
        break
    }
    
    if (error) {
      setValidationErrors(prev => ({ ...prev, [fieldName]: error }))
    } else {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
    }
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
      // Scroll to next section after accordion animation completes
      setTimeout(() => {
        // Find the accordion section and scroll to its top
        const accordionSection = document.querySelector(`[data-section="${nextSection}"]`)
        
        if (accordionSection) {
          // Use scrollIntoView with a block: start to position at top
          accordionSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          })
        }
      }, 500) // Even longer delay to ensure accordion animation fully completes
    }
  }

  // Validation functions for each section
  const isStep1Valid = () => {
    return bookingData.applianceType && bookingData.manufacturer && bookingData.applianceFault && bookingData.applianceFault.length >= 10
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
  
  // Add pricingOptions array
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
      // Log Loqate usage for monitoring
      console.log('Loqate Find API called', { 
        source: 'booking-form-widget',
        timestamp: new Date().toISOString(),
        query: query.substring(0, 3) + '...' // Log partial query for privacy
      })
      
      const response = await fetch(ADDRESS_LOOKUP_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "find",
          postcode: query,
        }),
      })
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
    
    // Update dropdown position when searching with a small delay to ensure accurate positioning
    setTimeout(() => {
      if (addressInputRef.current) {
        const rect = addressInputRef.current.getBoundingClientRect()
        console.log('Input position:', rect) // Debug log
        
        // For iframe context, we need to render the dropdown within the iframe, not the parent page
        // Use absolute positioning relative to the document instead of fixed
        const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
        const scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft
        
        setDropdownPosition({
          top: rect.bottom + scrollTop + 4,
          left: rect.left + scrollLeft,
          width: rect.width
        })
      }
    }, 10)
  }

  // Add selectAddress function
  const selectAddress = async (suggestion: { id: string; text: string; description: string }) => {
    try {
      // Log Loqate usage for monitoring
      console.log('Loqate Retrieve API called', { 
        source: 'booking-form-widget',
        timestamp: new Date().toISOString()
      })
      
      const response = await fetch(ADDRESS_LOOKUP_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "retrieve",
          addressId: suggestion.id,
        }),
      })
      if (!response.ok) {
        console.error("Loqate Retrieve API error:", response.status)
        return
      }
      const data = await response.json()
      if (data.address) {
        // Proxy returns simplified format
        const fullAddress = data.address + (data.postcode ? `, ${data.postcode}` : "")
        setBookingData((prev) => ({
          ...prev,
          address: data.address || "",
          fullAddress: fullAddress,
          postcode: data.postcode || "",
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

  // Add saveBookingToDatabase function using secure server action
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

  // Add handleStripePayment function
  const handleStripePayment = async () => {
    if (!selectedPricing || isSubmitting) return
    
    // Validate all fields before payment
    const errors: Record<string, string> = {}
    let hasErrors = false
    
    // Validate step 1 fields
    if (!bookingData.manufacturer || manufacturerSearch !== bookingData.manufacturer) {
      errors.manufacturer = 'Please select a brand from the list'
      hasErrors = true
    }
    
    const faultValidation = validateTextField(bookingData.applianceFault, 'Fault description', 10, 500)
    if (!faultValidation.isValid) {
      errors.applianceFault = faultValidation.errors[0]
      hasErrors = true
    }
    
    // Validate contact fields
    const nameValidation = validateName(bookingData.firstName, 'Full name')
    if (!nameValidation.isValid) {
      errors.firstName = nameValidation.errors[0]
      hasErrors = true
    }
    
    const mobileValidation = validateUKMobile(bookingData.mobile)
    if (!mobileValidation.isValid) {
      errors.mobile = mobileValidation.errors[0]
      hasErrors = true
    }
    
    const emailValidation = validateEmail(bookingData.email)
    if (!emailValidation.isValid) {
      errors.email = emailValidation.errors[0]
      hasErrors = true
    }
    
    if (!bookingData.fullAddress) {
      errors.address = 'Please select an address from the suggestions'
      hasErrors = true
    }
    
    if (hasErrors) {
      setValidationErrors(errors)
      // Expand sections with errors
      const errorSections = new Set<string>()
      if (errors.manufacturer || errors.applianceFault) errorSections.add('step1')
      if (errors.firstName || errors.mobile || errors.email || errors.address) errorSections.add('step3')
      setExpandedSections(Array.from(errorSections))
      return
    }
    
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
                  // Clear validation error when typing
                  if (validationErrors.manufacturer) {
                    setValidationErrors(prev => {
                      const newErrors = { ...prev }
                      delete newErrors.manufacturer
                      return newErrors
                    })
                  }
                }}
                onFocus={() => manufacturerSearch.length > 0 && setManufacturerOpen(true)}
                onBlur={() => {
                  setTimeout(() => setManufacturerOpen(false), 200)
                  // Validate on blur
                  if (manufacturerSearch && !bookingData.manufacturer) {
                    setValidationErrors(prev => ({ ...prev, manufacturer: 'Please select a brand from the list' }))
                  }
                }}
                className={`w-full text-base ${validationErrors.manufacturer ? 'border-red-500' : ''}`}
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
            {validationErrors.manufacturer && (
              <p className="text-xs text-red-600 mt-1">{validationErrors.manufacturer}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Appliance Fault <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={bookingData.applianceFault}
              onChange={(e) => updateBookingData("applianceFault", e.target.value)}
              onBlur={() => validateField("applianceFault")}
              placeholder="Describe the problem with your appliance (minimum 10 characters)..."
              minLength={10}
              maxLength={500}
              required
              className={`w-full min-h-[80px] text-base ${validationErrors.applianceFault ? 'border-red-500' : ''}`}
              disabled={isSubmitting}
            />
            {bookingData.applianceFault && bookingData.applianceFault.length < 10 && (
              <p className="text-sm text-red-600 mt-1">
                Please provide at least 10 characters ({10 - bookingData.applianceFault.length} more needed)
              </p>
            )}
            {validationErrors.applianceFault && !bookingData.applianceFault && (
              <p className="text-sm text-red-600 mt-1">{validationErrors.applianceFault}</p>
            )}
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
          onBlur={() => validateField("firstName")}
          placeholder="Enter your full name"
          required
          minLength={2}
          maxLength={100}
          pattern="[a-zA-Z\s\-']+"
          title="Name can only contain letters, spaces, hyphens, and apostrophes"
          className={`w-full text-base ${validationErrors.firstName ? 'border-red-500' : ''}`}
          disabled={isSubmitting}
        />
        {validationErrors.firstName && (
          <p className="text-xs text-red-600 mt-1">{validationErrors.firstName}</p>
        )}
      </div>
      <div className="space-y-4 mt-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mobile: <span className="text-red-500">*</span>
          </label>
          <Input
            type="tel"
            value={bookingData.mobile}
            onChange={(e) => updateBookingData("mobile", e.target.value)}
            onBlur={() => validateField("mobile")}
            placeholder="07xxx xxxxxx"
            required
            pattern="07[0-9]{9}"
            title="Please enter a valid UK mobile number starting with 07"
            className={`w-full text-base ${validationErrors.mobile ? 'border-red-500' : ''}`}
            disabled={isSubmitting}
          />
          {validationErrors.mobile && (
            <p className="text-xs text-red-600 mt-1">{validationErrors.mobile}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email: <span className="text-red-500">*</span>
          </label>
          <Input
            type="email"
            value={bookingData.email}
            onChange={(e) => updateBookingData("email", e.target.value)}
            onBlur={() => validateField("email")}
            required
            maxLength={255}
            className={`w-full text-base ${validationErrors.email ? 'border-red-500' : ''}`}
            disabled={isSubmitting}
          />
          {validationErrors.email && (
            <p className="text-xs text-red-600 mt-1">{validationErrors.email}</p>
          )}
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
              ref={addressInputRef}
              value={addressSearchValue}
              onChange={(e) => handleAddressSearch(e.target.value)}
              placeholder="Start typing your address..."
              required
              minLength={10}
              maxLength={500}
              className="w-full text-base pr-10"
              disabled={isSubmitting}
              onFocus={() => {
                setTimeout(() => {
                  if (addressInputRef.current) {
                    const rect = addressInputRef.current.getBoundingClientRect()
                    console.log('Focus position:', rect) // Debug log
                    
                    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
                    const scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft
                    
                    setDropdownPosition({
                      top: rect.bottom + scrollTop + 4,
                      left: rect.left + scrollLeft,
                      width: rect.width
                    })
                  }
                }, 10)
              }}
            />
            <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          {validationErrors.address && !bookingData.fullAddress && (
            <p className="text-xs text-red-600 mt-1">{validationErrors.address}</p>
          )}
          
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
              <a href="/terms" target="_blank" className="text-green-600 hover:underline">
                Terms and Conditions
              </a>{" "}
              and{" "}
              <a href="/privacy" target="_blank" className="text-green-600 hover:underline">
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
      <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8" style={{ boxShadow: '0 0 8px rgba(0, 0, 0, 0.1)' }}>
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
      
      {/* Portal for address dropdown to escape accordion overflow constraints */}
      {showAddressSuggestions && addressSuggestions.length > 0 && !isSubmitting && typeof window !== 'undefined' && 
        createPortal(
          <div 
            className="absolute z-[99999] bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`
            }}
            onClick={() => console.log('Dropdown position:', dropdownPosition)} // Debug log
          >
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
          </div>,
          document.body
        )
      }
    </div>
  )
} 
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Wrench,
  Search,
  Calendar,
  Shield,
  Star,
  CheckCircle,
  Clock,
  Users,
  Award,
  Zap,
  Home,
  Menu,
  X,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { DiagnosticForm } from "./components/diagnostic-form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookingModal } from "./components/booking-modal"

export default function Component() {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const [partsSearchData, setPartsSearchData] = useState({
    applianceType: "",
    brand: "",
    modelNumber: "",
  })
  const [isSearchingParts, setIsSearchingParts] = useState(false)
  const [partsSearchResult, setPartsSearchResult] = useState<{
    found: boolean
    modelName?: string
    partsUrl?: string
  } | null>(null)

  const getDynamicAvailability = () => {
    const now = new Date()
    const currentHour = now.getHours()

    if (currentHour < 12) {
      return "✓ Next available: Today Before 6PM"
    } else {
      // For afternoon/evening, show tomorrow options
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dayOfWeek = tomorrow.getDay()

      // If tomorrow is weekend (Saturday = 6, Sunday = 0), show Monday
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return "✓ Next available: Monday AM"
      } else {
        return "✓ Next available: Tomorrow AM"
      }
    }
  }

  const handlePartsSearch = async () => {
    if (!partsSearchData.applianceType || !partsSearchData.brand || !partsSearchData.modelNumber.trim()) {
      return
    }

    setIsSearchingParts(true)
    setPartsSearchResult(null)

    // Simulate API call to search for parts
    setTimeout(() => {
      // Mock logic - in real implementation, this would call your parts database API
      const modelFound = Math.random() > 0.3 // 70% chance of finding the model for demo

      if (modelFound) {
        setPartsSearchResult({
          found: true,
          modelName: `${partsSearchData.brand} ${partsSearchData.applianceType} ${partsSearchData.modelNumber}`,
          partsUrl: `https://parts.rsrepairs.com/${partsSearchData.brand.toLowerCase()}/${partsSearchData.applianceType.toLowerCase().replace(/\s+/g, "-")}/${partsSearchData.modelNumber.toLowerCase()}`,
        })
      } else {
        setPartsSearchResult({
          found: false,
        })
      }

      setIsSearchingParts(false)
    }, 1500)
  }

  const updatePartsSearchData = (field: keyof typeof partsSearchData, value: string) => {
    setPartsSearchData((prev) => ({ ...prev, [field]: value }))
  }

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" })
    setIsMobileMenuOpen(false)
  }

  const handleBookEngineerFromDiagnostic = () => {
    setIsBookingModalOpen(true)
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-white sticky top-0 z-50">
        <Link href="/" className="flex items-center justify-center">
          <Wrench className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
          <span className="ml-2 text-lg sm:text-xl font-bold text-gray-900">RS Repairs</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="ml-auto hidden md:flex gap-4 sm:gap-6">
          <button
            onClick={() => scrollToSection("services")}
            className="text-sm font-medium hover:text-orange-600 transition-colors cursor-pointer"
          >
            Services
          </button>
          <button
            onClick={() => scrollToSection("diagnosis")}
            className="text-sm font-medium hover:text-orange-600 transition-colors cursor-pointer"
          >
            Diagnosis
          </button>
          <button
            onClick={() => scrollToSection("about")}
            className="text-sm font-medium hover:text-orange-600 transition-colors cursor-pointer"
          >
            About
          </button>
          <button
            onClick={() => scrollToSection("contact")}
            className="text-sm font-medium hover:text-orange-600 transition-colors cursor-pointer"
          >
            Contact
          </button>
        </nav>

        {/* Mobile Menu Button */}
        <button className="ml-auto md:hidden p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X className="h-6 w-6 text-gray-600" /> : <Menu className="h-6 w-6 text-gray-600" />}
        </button>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="absolute top-16 left-0 right-0 bg-white border-b shadow-lg md:hidden">
            <nav className="flex flex-col p-4 space-y-4">
              <button
                onClick={() => scrollToSection("services")}
                className="text-left text-sm font-medium hover:text-orange-600 transition-colors cursor-pointer py-2"
              >
                Services
              </button>
              <button
                onClick={() => scrollToSection("diagnosis")}
                className="text-left text-sm font-medium hover:text-orange-600 transition-colors cursor-pointer py-2"
              >
                Diagnosis
              </button>
              <button
                onClick={() => scrollToSection("about")}
                className="text-left text-sm font-medium hover:text-orange-600 transition-colors cursor-pointer py-2"
              >
                About
              </button>
              <button
                onClick={() => scrollToSection("contact")}
                className="text-left text-sm font-medium hover:text-orange-600 transition-colors cursor-pointer py-2"
              >
                Contact
              </button>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-8 md:py-16 lg:py-24 xl:py-32 bg-gradient-to-br from-orange-50 to-orange-100">
          <div className="container px-4 md:px-6 max-w-6xl mx-auto">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200 text-xs sm:text-sm">
                    #1 Appliance Repair Service
                  </Badge>
                  <h1 className="text-2xl font-bold tracking-tighter sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl/none text-gray-900">
                    Your Appliance Broke?
                    <span className="text-orange-600"> We've Got You Covered</span>
                  </h1>
                  <p className="max-w-[600px] text-gray-600 text-base sm:text-lg md:text-xl">
                    Choose your perfect solution: Find spare parts for DIY repairs, book a certified engineer, or
                    protect your appliances with our comprehensive warranty plans.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-3 justify-start">
                  <Button
                    size="lg"
                    className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto text-sm sm:text-base"
                    onClick={() => scrollToSection("diagnosis")}
                  >
                    Diagnose your fault
                  </Button>
                  <Button
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto text-sm sm:text-base"
                    onClick={() => scrollToSection("services")}
                  >
                    Choose your service
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-orange-600 text-orange-600 hover:bg-orange-50 w-full sm:w-auto text-sm sm:text-base"
                    onClick={() => window.open("tel:03030036404", "_self")}
                  >
                    Call: 0303 003 6404
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 justify-start">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">4.9/5</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>50,000+ Happy Customers</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Award className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>Licensed & Insured</span>
                  </div>
                </div>
              </div>
              <div className="order-first lg:order-last">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/u1413117298_home_appliance_repair_engineer_fixing_a_washing_m_8d6cb4f2-d9c0-4104-80fc-e2347e5d6011_0-BJSdS62cYeaxjal14Kq6TBUiXHfdJm.png"
                  width="600"
                  height="400"
                  alt="Professional appliance repair technician working on washing machine"
                  className="mx-auto aspect-video overflow-hidden rounded-xl object-cover w-full max-w-md lg:max-w-none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Main Service Options */}
        <section id="services" className="w-full py-8 md:py-16 lg:py-24 xl:py-32">
          <div className="container px-4 md:px-6 max-w-6xl mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl md:text-4xl lg:text-5xl text-gray-900">
                  Choose Your Solution
                </h2>
                <p className="max-w-[900px] text-gray-600 text-sm sm:text-base md:text-lg lg:text-xl/relaxed">
                  Whether you're a DIY enthusiast, need professional help, or want peace of mind, we have the perfect
                  solution for your appliance needs.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-6xl items-stretch gap-4 sm:gap-6 py-8 sm:py-12 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {/* Professional Service Option */}
              <Card className="relative overflow-hidden border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 hover:border-orange-300 transition-all duration-300 hover:shadow-lg group flex flex-col">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-orange-600"></div>
                <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
                  <Badge className="bg-orange-600 text-white text-xs px-2 py-1">Most Popular</Badge>
                </div>
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-orange-200 group-hover:bg-orange-300 transition-colors">
                    <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-orange-700" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl mb-2">Book an Engineer</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Schedule a certified technician to diagnose and repair your appliance
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 p-4 sm:p-6">
                  <div className="text-center space-y-3 flex-1">
                    <div className="bg-white/70 rounded-lg p-3 sm:p-4 border border-orange-200">
                      <div className="text-base sm:text-lg font-bold text-orange-700 mb-2">Call out and Repair</div>
                      <div className="text-xl sm:text-2xl font-bold text-orange-600 mb-1">From £109</div>
                      <div className="text-xs sm:text-sm text-gray-600">Price varies by service speed</div>
                    </div>

                    <Button
                      className="w-full bg-orange-600 hover:bg-orange-700 h-9 sm:h-10 text-xs sm:text-sm font-medium"
                      onClick={() => setIsBookingModalOpen(true)}
                    >
                      <Calendar className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      Book Appointment
                    </Button>

                    <div className="text-xs text-green-700 font-medium">{getDynamicAvailability()}</div>
                  </div>

                  {/* Bottom section - Perfect for section */}
                  <div className="mt-auto border-t pt-3">
                    <div className="grid grid-cols-2 gap-1 sm:gap-2 text-xs text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                        <span>Certified engineers</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                        <span>Full UK coverage</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                        <span>Same-day service</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                        <span>1-year warranty</span>
                      </div>
                    </div>
                    <div className="p-2 bg-white border border-orange-300 rounded text-xs text-orange-700 text-center">
                      Perfect for complex repairs
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* DIY Parts Option */}
              <Card className="relative overflow-hidden border-2 hover:border-blue-300 transition-all duration-300 hover:shadow-lg group flex flex-col">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors">
                    <Search className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl mb-2">Find Spare Parts</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Search our extensive inventory of genuine parts for all major appliance brands
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 p-4 sm:p-6">
                  <div className="space-y-3 flex-1">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Appliance Type <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={partsSearchData.applianceType}
                        onValueChange={(value) => updatePartsSearchData("applianceType", value)}
                      >
                        <SelectTrigger className="w-full h-8 sm:h-9 text-xs sm:text-sm">
                          <SelectValue placeholder="Select appliance" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Washing Machine">Washing Machine</SelectItem>
                          <SelectItem value="Dishwasher">Dishwasher</SelectItem>
                          <SelectItem value="Refrigerator">Refrigerator</SelectItem>
                          <SelectItem value="Oven">Oven</SelectItem>
                          <SelectItem value="Tumble Dryer">Tumble Dryer</SelectItem>
                          <SelectItem value="Cooker">Cooker</SelectItem>
                          <SelectItem value="Microwave">Microwave</SelectItem>
                          <SelectItem value="Freezer">Freezer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Brand <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={partsSearchData.brand}
                        onValueChange={(value) => updatePartsSearchData("brand", value)}
                      >
                        <SelectTrigger className="w-full h-8 sm:h-9 text-xs sm:text-sm">
                          <SelectValue placeholder="Select brand" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bosch">Bosch</SelectItem>
                          <SelectItem value="Samsung">Samsung</SelectItem>
                          <SelectItem value="LG">LG</SelectItem>
                          <SelectItem value="Whirlpool">Whirlpool</SelectItem>
                          <SelectItem value="Hotpoint">Hotpoint</SelectItem>
                          <SelectItem value="Beko">Beko</SelectItem>
                          <SelectItem value="AEG">AEG</SelectItem>
                          <SelectItem value="Siemens">Siemens</SelectItem>
                          <SelectItem value="Indesit">Indesit</SelectItem>
                          <SelectItem value="Zanussi">Zanussi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Model Number</label>
                      <Input
                        placeholder="e.g., WAW28750GB"
                        className="w-full h-8 sm:h-9 text-xs sm:text-sm"
                        value={partsSearchData.modelNumber}
                        onChange={(e) => updatePartsSearchData("modelNumber", e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">Found on door sticker or back panel</p>
                    </div>

                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 h-8 sm:h-9 text-xs sm:text-sm font-medium"
                      onClick={handlePartsSearch}
                      disabled={
                        isSearchingParts ||
                        !partsSearchData.applianceType ||
                        !partsSearchData.brand ||
                        !partsSearchData.modelNumber.trim()
                      }
                    >
                      {isSearchingParts ? (
                        <>
                          <div className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          Search Parts
                        </>
                      )}
                    </Button>

                    {/* Search Results */}
                    {partsSearchResult && (
                      <div className="border-t pt-3">
                        {partsSearchResult.found ? (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                              <span className="text-xs sm:text-sm font-medium text-green-800">Model Found!</span>
                            </div>
                            <p className="text-xs text-green-700">{partsSearchResult.modelName}</p>
                            <Button
                              className="w-full bg-green-600 hover:bg-green-700 h-7 sm:h-8 text-xs font-medium"
                              onClick={() => window.open(partsSearchResult.partsUrl, "_blank")}
                            >
                              View all parts for your model
                            </Button>
                          </div>
                        ) : (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <Search className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
                              <span className="text-xs sm:text-sm font-medium text-orange-800">Model not found</span>
                            </div>
                            <p className="text-xs text-orange-700">
                              We couldn't find parts for this specific model. Try browsing by brand or contact us for
                              assistance.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button
                                variant="outline"
                                className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-100 h-7 sm:h-8 text-xs"
                                onClick={() =>
                                  window.open(
                                    `https://parts.rsrepairs.com/${partsSearchData.brand.toLowerCase()}`,
                                    "_blank",
                                  )
                                }
                              >
                                Browse {partsSearchData.brand}
                              </Button>
                              <Button
                                variant="outline"
                                className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-100 h-7 sm:h-8 text-xs"
                                onClick={() => scrollToSection("contact")}
                              >
                                Contact Us
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom section - Perfect for section */}
                  <div className="mt-auto border-t pt-3">
                    {!partsSearchResult && (
                      <div className="grid grid-cols-2 gap-1 sm:gap-2 text-xs text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                          <span>Genuine OEM</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                          <span>Fast shipping</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                          <span>Install guides</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                          <span>90-day warranty</span>
                        </div>
                      </div>
                    )}
                    <div className="p-2 bg-blue-50 rounded text-xs text-blue-700 text-center">
                      Perfect for DIY enthusiasts
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Warranty Option */}
              <Card className="relative overflow-hidden border-2 hover:border-green-300 transition-all duration-300 hover:shadow-lg group flex flex-col md:col-span-2 lg:col-span-1">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-green-600"></div>
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-green-100 group-hover:bg-green-200 transition-colors">
                    <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl mb-2">Warranty Protection</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Comprehensive coverage plans to protect your appliances from unexpected repairs
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 p-4 sm:p-6">
                  <div className="space-y-3 flex-1">
                    <div className="bg-green-50 rounded-lg p-3 sm:p-4 border border-green-200 text-center">
                      <div className="text-base sm:text-lg font-bold text-green-700 mb-2">Cover up to 3 appliances</div>
                      <div className="text-xl sm:text-2xl font-bold text-orange-600 mb-1">Get 30% OFF</div>
                      <div className="text-xs sm:text-sm text-gray-600">Limited time offer</div>
                    </div>

                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 text-white h-9 sm:h-10 text-xs sm:text-sm font-medium"
                      onClick={() =>
                        window.open("https://ransom.warrantyonline.co.uk/App_Pages/MonthlyBuildYourOwn.aspx", "_blank")
                      }
                    >
                      <Shield className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      Get Quote Now
                    </Button>
                  </div>

                  {/* Bottom section - Perfect for section */}
                  <div className="mt-auto border-t pt-3">
                    <div className="grid grid-cols-2 gap-1 sm:gap-2 text-xs text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                        <span>Unlimited repairs</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                        <span>Parts & labour</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                        <span>24/7 helpline</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                        <span>No excess fees</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                        <span>Annual service</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                        <span>Emergency cover</span>
                      </div>
                    </div>
                    <div className="p-2 bg-green-50 rounded text-xs text-green-700 text-center">
                      Perfect for multiple appliances
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* AI Diagnostic Section */}
        <section
          id="diagnosis"
          className="w-full py-8 md:py-16 lg:py-24 xl:py-32 bg-gradient-to-br from-blue-50 to-indigo-50"
        >
          <div className="container px-4 md:px-6 max-w-6xl mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 text-xs sm:text-sm">
                  AI-Powered Diagnostics
                </Badge>
                <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl md:text-4xl lg:text-5xl text-gray-900">
                  Let Us Help You Make The Right Repair Choice?
                </h2>
                <p className="max-w-[900px] text-gray-600 text-sm sm:text-base md:text-lg lg:text-xl/relaxed">
                  Describe your appliance problem and our AI will help diagnose potential issues and suggest next steps
                </p>
              </div>
            </div>
            <div className="mx-auto max-w-3xl py-8 sm:py-12">
              <DiagnosticForm onBookEngineer={handleBookEngineerFromDiagnostic} />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="about" className="w-full py-8 md:py-16 lg:py-24 xl:py-32 bg-gray-50">
          <div className="container px-4 md:px-6 max-w-6xl mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl md:text-4xl lg:text-5xl text-gray-900">
                  Why Choose RS Repairs?
                </h2>
                <p className="max-w-[900px] text-gray-600 text-sm sm:text-base md:text-lg lg:text-xl/relaxed">
                  We're the trusted choice for appliance repair with over 20 years of experience
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-8 sm:py-12 lg:grid-cols-2 lg:gap-12">
              <Image
                src="/placeholder.svg?height=400&width=600"
                width="600"
                height="400"
                alt="Professional repair workshop"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover w-full"
              />
              <div className="flex flex-col justify-center space-y-4 sm:space-y-6">
                <div className="grid gap-4 sm:gap-6">
                  <div className="flex gap-3 sm:gap-4">
                    <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-orange-100 flex-shrink-0">
                      <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold">Fast Response Time</h3>
                      <p className="text-sm sm:text-base text-gray-600">
                        Same-day service available with 2-hour arrival windows
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 sm:gap-4">
                    <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-blue-100 flex-shrink-0">
                      <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold">Expert Technicians</h3>
                      <p className="text-sm sm:text-base text-gray-600">
                        Certified professionals with 10+ years experience
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 sm:gap-4">
                    <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-green-100 flex-shrink-0">
                      <Home className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold">All Major Brands</h3>
                      <p className="text-sm sm:text-base text-gray-600">We service all appliance brands and models</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="w-full py-8 md:py-16 lg:py-24 xl:py-32">
          <div className="container px-4 md:px-6 max-w-6xl mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl md:text-4xl lg:text-5xl text-gray-900">
                  What Our Customers Say
                </h2>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-4 sm:gap-6 py-8 sm:py-12 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                  <div className="flex mb-3 sm:mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">
                    "Found the exact part I needed for my 10-year-old dishwasher. Great prices and fast shipping!"
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-gray-200"></div>
                    <div>
                      <p className="font-medium text-xs sm:text-sm">Sarah M.</p>
                      <p className="text-xs text-gray-500">DIY Customer</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                  <div className="flex mb-3 sm:mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">
                    "Technician arrived on time and fixed my washing machine in 30 minutes. Professional service!"
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-gray-200"></div>
                    <div>
                      <p className="font-medium text-xs sm:text-sm">Mike R.</p>
                      <p className="text-xs text-gray-500">Service Customer</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="md:col-span-2 lg:col-span-1">
                <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                  <div className="flex mb-3 sm:mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">
                    "The warranty plan saved me £800 when my refrigerator compressor failed. Worth every penny!"
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-gray-200"></div>
                    <div>
                      <p className="font-medium text-xs sm:text-sm">Lisa K.</p>
                      <p className="text-xs text-gray-500">Warranty Customer</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      {/* Booking Modal */}
      <BookingModal isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} />
    </div>
  )
}

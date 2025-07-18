//force commit
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
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
  Phone,
  MapPin,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { DiagnosticForm } from "./components/diagnostic-form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookingModal } from "./components/booking-modal"
import { SparePartsSearch } from "@/components/spare-parts-search"

export default function Component() {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
          <img 
            src="https://ih5f1pkyy3brtmob.public.blob.vercel-storage.com/RepairHelpLogov2.png" 
            alt="Repair Help" 
            className="h-10 sm:h-12 w-auto"
          />
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
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-8 md:py-16 lg:py-24 xl:py-32 bg-gradient-to-br from-orange-50 to-orange-100">
          <div className="container px-4 md:px-6 max-w-6xl mx-auto">
            <div className="flex flex-col xl:flex-row items-center xl:items-stretch gap-6 xl:gap-12">
              {/* Text content */}
              <div className="order-2 xl:order-1 flex-1 flex flex-col justify-center space-y-4 w-full">
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
                    className="w-full sm:flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold text-base sm:text-lg rounded-lg py-3"
                    onClick={() => scrollToSection("diagnosis")}
                  >
                    Diagnose your fault
                  </Button>
                  <Button
                    size="lg"
                    className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base sm:text-lg rounded-lg py-3"
                    onClick={() => scrollToSection("services")}
                  >
                    Choose your service
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:flex-1 border-orange-600 text-orange-600 hover:bg-orange-50 font-bold text-base sm:text-lg rounded-lg py-3"
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
              {/* Image */}
              <div className="order-1 xl:order-2 w-full mb-6 xl:mb-0 xl:w-[600px] flex-shrink-0 flex justify-center items-center">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/u1413117298_home_appliance_repair_engineer_fixing_a_washing_m_8d6cb4f2-d9c0-4104-80fc-e2347e5d6011_0-BJSdS62cYeaxjal14Kq6TBUiXHfdJm.png"
                  width={600}
                  height={400}
                  alt="Professional appliance repair engineer working on washing machine"
                  className="w-full max-w-full h-auto aspect-video rounded-xl object-cover"
                />
              </div>
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
                  DiagnoSys - Make The Right Repair Choice!
                </h2>
              </div>
            </div>
            <div className="mx-auto max-w-3xl py-8 sm:py-12">
              <DiagnosticForm onBookEngineer={handleBookEngineerFromDiagnostic} />
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
                    Schedule a certified engineer to diagnose and repair your appliance
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 p-4 sm:p-6">
                  <div className="text-center space-y-3 flex-1">
                    <div className="bg-white/70 rounded-lg p-3 sm:p-4 border border-orange-200">
                      <div className="text-base sm:text-lg font-bold text-orange-700 mb-2">Call out and Repair</div>
                      <div className="text-xl sm:text-2xl font-bold text-orange-600 mb-1">From £139.00</div>
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
                        <span>60-day guarantee</span>
                      </div>
                    </div>
                    <div className="p-2 bg-white border border-orange-300 rounded text-xs text-orange-700 text-center">
                      Perfect for complex repairs
                    </div>
                  </div>
                </CardContent>
              </Card>

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
    <div className="flex-1">
      {/* Use the real spare parts search component */}
      <SparePartsSearch />
    </div>

    {/* Bottom section - Perfect for section */}
    <div className="mt-auto border-t pt-3">
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


        {/* Features Section */}
        <section id="about" className="w-full py-8 md:py-16 lg:py-24 xl:py-32 bg-gray-50">
          <div className="container px-4 md:px-6 max-w-6xl mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl md:text-4xl lg:text-5xl text-gray-900">
                  Why Choose Repair Help?
                </h2>
                <p className="max-w-[900px] text-gray-600 text-sm sm:text-base md:text-lg lg:text-xl/relaxed">
                  We're the trusted choice for appliance repair with over 20 years of experience
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-8 sm:py-12 lg:grid-cols-2 lg:gap-12">
              <Image
                src="https://ih5f1pkyy3brtmob.public.blob.vercel-storage.com/Why-Us-csc5Uv18ytP51ivOZR4VEybacGhRKK.png"
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
                      <h3 className="text-base sm:text-lg font-bold">Expert Engineers</h3>
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
                    "Engineer arrived on time and fixed my washing machine in 30 minutes. Professional service!"
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

      {/* Footer */}
      <footer
        id="contact"
        className="w-full py-8 md:py-12 bg-gradient-to-br from-orange-50 to-orange-100 text-gray-900"
      >
        <div className="container px-4 md:px-6 max-w-6xl mx-auto">
          <div className="grid gap-8 lg:grid-cols-4 md:grid-cols-2">
            <div className="space-y-4 lg:pr-4">
              <img 
                src="https://ih5f1pkyy3brtmob.public.blob.vercel-storage.com/RepairHelpLogov2.png" 
                alt="Repair Help" 
                className="h-10 w-auto mb-2"
              />
              <p className="text-sm text-gray-600">
                Part of the Ransom Spares Group - Your trusted partner for appliance repair solutions.
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">4.9/5</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>50,000+ Customers</span>
                </div>
              </div>
            </div>
            <div className="space-y-4 lg:pl-6">
              <h3 className="text-lg font-semibold">Services</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <button onClick={() => scrollToSection("services")} className="hover:text-orange-600 transition-colors cursor-pointer">
                    Appliance Repair
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection("services")} className="hover:text-orange-600 transition-colors cursor-pointer">
                    Spare Parts
                  </button>
                </li>
                <li>
                  <button onClick={() => window.open("https://ransom.warrantyonline.co.uk/App_Pages/MonthlyBuildYourOwn.aspx", "_blank")} className="hover:text-orange-600 transition-colors cursor-pointer">
                    Warranty Plans
                  </button>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Contact</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <a href="tel:03030036404" className="hover:text-orange-600 transition-colors">0303 003 6404</a>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span>Full UK Coverage</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Hours</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div>Mon - Fri: 8:00 AM - 6:00 PM</div>
                <div>Saturday: 9:00 AM - 6:00 PM</div>
                <div>Sunday: 10:00 AM - 6:00 PM</div>
                <div className="text-orange-600 font-medium">Same Day Service Available</div>
              </div>
            </div>
          </div>
          <div className="border-t border-orange-200 mt-8 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-600 text-center md:text-left">
                © 2025 Repair Help - Part of Ransom Spares Group. All rights reserved.
              </div>
              <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    <span>Licensed & Insured</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    <span>Data Protected</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <a
                    href="/terms"
                    className="text-sm text-gray-600 hover:text-orange-600 transition-colors cursor-pointer"
                  >
                    Terms & Conditions
                  </a>
                  <a
                    href="/privacy"
                    className="text-sm text-gray-600 hover:text-orange-600 transition-colors cursor-pointer"
                  >
                    Privacy Policy
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Booking Modal */}
      <BookingModal isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} />
    </div>
  )
}

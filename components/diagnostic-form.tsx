"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  Lightbulb,
  Loader2,
  Wrench,
  Search,
  Calendar,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Mail,
  KeyRound,
  ChevronUp,
  Eye,
  X,
  Info,
} from "lucide-react"
import { diagnoseProblem } from "../actions/diagnose"
import { Checkbox } from "@/components/ui/checkbox"

interface DiagnosisResult {
  errorCodeMeaning?: string
  possibleCauses: string[]
  recommendations: {
    diy: string[]
    professional: string[]
  }
  urgency: "low" | "medium" | "high"
  estimatedCost: string
  difficulty: "easy" | "moderate" | "difficult" | "expert"
  recommendedService: "diy" | "professional" | "warranty"
  serviceReason: string
  skillsRequired?: string[]
  timeEstimate: string
  safetyWarnings?: string[]
}

interface DiagnosticFormProps {
  onBookEngineer?: () => void
}

const exampleDiagnosis: DiagnosisResult = {
  errorCodeMeaning: "E4 on Samsung washing machines indicates an unbalanced load error. The machine has detected that the clothes inside are not distributed evenly, preventing the spin cycle from completing safely.",
  possibleCauses: [
    "Loose or damaged drum bearings",
    "Foreign object (coin, pin, etc.) stuck in drum",
    "Worn drive belt",
    "Unbalanced load",
    "Damaged shock absorbers",
    "Loose transit bolts"
  ],
  recommendations: {
    diy: [
      "Check if transit bolts were left in place",
      "Inspect drum for loose objects",
      "Ensure machine is level on floor",
      "Check load distribution",
      "Inspect visible belt for damage"
    ],
    professional: [
      "Bearing replacement service",
      "Full mechanical inspection",
      "Drive belt replacement",
      "Shock absorber replacement",
      "Control system diagnostic testing",
      "Complete appliance safety check"
    ]
  },
  urgency: "medium",
  estimatedCost: "£109 - £149",
  difficulty: "difficult",
  recommendedService: "professional",
  serviceReason: "Professional service needed for this repair",
  skillsRequired: ["Mechanical knowledge", "Electrical safety awareness", "Special washing machine tools", "Heavy lifting capability"],
  timeEstimate: "2 - 3 hours",
  safetyWarnings: [
    "Do not operate machine if noise is very severe - could cause further damage",
    "Machine contains heavy components - lifting hazard",
    "Electrical components present shock risk",
    "Sharp edges when dismantling",
    "Water damage risk if pipes not properly disconnected"
  ]
}

export function DiagnosticForm({ onBookEngineer }: DiagnosticFormProps) {
  const [appliance, setAppliance] = useState("")
  const [brand, setBrand] = useState("")
  const [problem, setProblem] = useState("")
  const [showEmailVerification, setShowEmailVerification] = useState(false)
  const [email, setEmail] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null)
  const [error, setError] = useState("")
  const [showExample, setShowExample] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [emailSentStatus, setEmailSentStatus] = useState<'pending' | 'success' | 'error' | null>(null)

  const handleAskAI = () => {
    if (!appliance.trim() || !problem.trim()) {
      setError("Please fill in appliance type and problem description")
      return
    }
    setError("")
    setShowEmailVerification(true)
  }

  const handleShowExample = () => {
    setShowExample(true)
    setDiagnosis(null)
  }

  const handleCloseExample = () => {
    setShowExample(false)
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError("Please enter your email address")
      return
    }

    setIsVerifying(true)
    setError("")

    try {
      const response = await fetch('/api/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setIsVerifying(false)
        setIsEmailSent(true)
      } else {
        setIsVerifying(false)
        setError(data.error || 'Failed to send verification code. Please try again.')
      }
    } catch (error) {
      setIsVerifying(false)
      setError('Network error. Please check your connection and try again.')
    }
  }

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!verificationCode.trim()) {
      setError("Please enter the verification code")
      return
    }

    if (verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit verification code")
      return
    }

    setIsVerifying(true)
    setError("")

    try {
      const response = await fetch('/api/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.trim(), 
          code: verificationCode.trim() 
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setIsVerifying(false)
        setIsEmailVerified(true)
        handleDiagnosticSubmit()
      } else {
        setIsVerifying(false)
        setError(data.error || 'Invalid verification code. Please try again.')
      }
    } catch (error) {
      setIsVerifying(false)
      setError('Network error. Please check your connection and try again.')
    }
  }

  const sendDiagnosticEmail = async (diagnosisResult: DiagnosisResult) => {
    setIsSendingEmail(true)
    setEmailSentStatus('pending')
    
    try {
      const response = await fetch('/api/send-diagnostic-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          appliance,
          brand,
          problem,
          diagnosis: diagnosisResult,
          errorCode: diagnosisResult.errorCodeMeaning ? problem.match(/[A-Z]+[0-9]+|[0-9]+[A-Z]+|[A-Z]-?[0-9]+|[0-9]+-?[A-Z]+/i)?.[0] || null : null
        })
      })
      
      if (response.ok) {
        setEmailSentStatus('success')
      } else {
        const errorData = await response.json()
        console.error('Failed to send diagnostic email:', errorData.error)
        setEmailSentStatus('error')
      }
    } catch (error) {
      console.error('Error sending diagnostic email:', error)
      setEmailSentStatus('error')
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleDiagnosticSubmit = async () => {
    setIsLoading(true)
    setError("")
    setDiagnosis(null)
    setShowExample(false)
    setEmailSentStatus(null)

    try {
      const result = await diagnoseProblem(appliance, brand, problem, email)
      setDiagnosis(result)
      
      // Send email report after successful diagnosis
      sendDiagnosticEmail(result)
    } catch (err) {
      setError("Sorry, we encountered an error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const resendVerificationCode = async () => {
    setIsVerifying(true)
    setError("")
    
    try {
      const response = await fetch('/api/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setIsVerifying(false)
      } else {
        setIsVerifying(false)
        setError(data.error || 'Failed to resend verification code. Please try again.')
      }
    } catch (error) {
      setIsVerifying(false)
      setError('Network error. Please check your connection and try again.')
    }
  }

  const scrollToServices = () => {
    document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })
  }

  const handleBookEngineer = () => {
    if (onBookEngineer) {
      onBookEngineer()
    } else {
      scrollToServices()
    }
  }

  const handleFindParts = () => {
    scrollToServices()
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800"
      case "moderate":
        return "bg-blue-100 text-blue-800"
      case "difficult":
        return "bg-orange-100 text-orange-800"
      case "expert":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getServiceRecommendation = (service: string) => {
    switch (service) {
      case "diy":
        return {
          title: "DIY Repair Recommended",
          icon: <Wrench className="h-5 w-5 text-blue-600" />,
          color: "border-blue-200 bg-blue-50",
          buttonText: "Find Parts",
          buttonColor: "bg-blue-600 hover:bg-blue-700",
          buttonAction: handleFindParts,
        }
      case "professional":
        return {
          title: "Professional Service Recommended",
          icon: <Calendar className="h-5 w-5 text-orange-600" />,
          color: "border-orange-200 bg-orange-50",
          buttonText: "Book Engineer",
          buttonColor: "bg-orange-600 hover:bg-orange-700",
          buttonAction: handleBookEngineer,
        }
      case "warranty":
        return {
          title: "Warranty Protection Recommended",
          icon: <Shield className="h-5 w-5 text-green-600" />,
          color: "border-green-200 bg-green-50",
          buttonText: "View Warranty Plans",
          buttonColor: "bg-green-600 hover:bg-green-700",
          buttonAction: scrollToServices,
        }
      default:
        return {
          title: "Service Recommendation",
          icon: <AlertCircle className="h-5 w-5" />,
          color: "border-gray-200 bg-gray-50",
          buttonText: "Get Help",
          buttonColor: "bg-gray-600 hover:bg-gray-700",
          buttonAction: scrollToServices,
        }
    }
  }

  // Helper function to safely capitalize strings
  const safeCapitalize = (str: string | null | undefined): string => {
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  const renderDiagnosticResults = (diagnosisData: DiagnosisResult, isExample: boolean = false) => {
    // Validate the diagnosis data has required fields
    if (!diagnosisData || !diagnosisData.possibleCauses || !diagnosisData.recommendations) {
      return (
        <Card className="border-2 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800">Unable to display diagnosis results. Please try again.</p>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-6">
        {isExample && (
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Eye className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-800">Example Diagnostic Report</p>
                    <p className="text-xs text-blue-600">This is what your DiagnoSys will look like</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseExample}
                  className="text-blue-600 hover:bg-blue-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!isExample && (
          <Card className="border-2 border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Diagnosis Complete! See Details Below</p>
                  <p className="text-xs text-green-600">Report sent to: {email}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Code Explanation - NEW SECTION */}
        {diagnosisData.errorCodeMeaning && (
          <Card className="border-l-4 border-l-purple-600 bg-purple-50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Info className="h-6 w-6 text-purple-600" />
                <div>
                  <CardTitle className="text-lg text-purple-800">Error Code Explanation</CardTitle>
                  <CardDescription className="text-purple-600">What this error means for your appliance</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-purple-800 font-medium">{diagnosisData.errorCodeMeaning}</p>
            </CardContent>
          </Card>
        )}

        {diagnosisData.recommendedService === "warranty" && (
          <Card className={`border-l-4 ${getServiceRecommendation(diagnosisData.recommendedService).color}`}>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3 flex-1">
                  {getServiceRecommendation(diagnosisData.recommendedService).icon}
                  <div className="flex-1">
                    <CardTitle className="text-xl">
                      {getServiceRecommendation(diagnosisData.recommendedService).title}
                    </CardTitle>
                    <CardDescription className="mt-1">{diagnosisData.serviceReason}</CardDescription>
                  </div>
                </div>
                <Button
                  className={`${getServiceRecommendation(diagnosisData.recommendedService).buttonColor} text-white w-full sm:w-auto`}
                  onClick={getServiceRecommendation(diagnosisData.recommendedService).buttonAction}
                >
                  {getServiceRecommendation(diagnosisData.recommendedService).buttonText}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}

        {(diagnosisData.recommendedService === "diy" || diagnosisData.recommendedService === "professional") && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className={`border-l-4 flex flex-col ${diagnosisData.recommendedService === "diy" ? "border-l-blue-600 bg-blue-50" : "border-l-gray-300 bg-gray-50"}`}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Wrench className={`h-5 w-5 ${diagnosisData.recommendedService === "diy" ? "text-blue-600" : "text-gray-600"}`} />
                  <div className="flex-1">
                    <CardTitle className={`text-lg ${diagnosisData.recommendedService === "diy" ? "text-blue-800" : "text-gray-700"}`}>
                      Try DIY First
                      {diagnosisData.recommendedService === "diy" && (
                        <Badge className="ml-2 bg-blue-100 text-blue-800 text-xs">Recommended</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Simple checks you can do yourself
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-2 mb-4 flex-1">
                  {(diagnosisData.recommendations?.diy || []).map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className={`h-1.5 w-1.5 rounded-full mt-2 flex-shrink-0 ${diagnosisData.recommendedService === "diy" ? "bg-blue-600" : "bg-gray-400"}`} />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={diagnosisData.recommendedService === "diy" ? "default" : "outline"}
                  className={`w-full mt-auto ${diagnosisData.recommendedService === "diy" ? "bg-blue-600 hover:bg-blue-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
                  onClick={handleFindParts}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Find Parts
                </Button>
              </CardContent>
            </Card>

            <Card className={`border-l-4 flex flex-col ${diagnosisData.recommendedService === "professional" ? "border-l-orange-600 bg-orange-50" : "border-l-gray-300 bg-gray-50"}`}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Calendar className={`h-5 w-5 ${diagnosisData.recommendedService === "professional" ? "text-orange-600" : "text-gray-600"}`} />
                  <div className="flex-1">
                    <CardTitle className={`text-lg ${diagnosisData.recommendedService === "professional" ? "text-orange-800" : "text-gray-700"}`}>
                      Book an Engineer
                      {diagnosisData.recommendedService === "professional" && (
                        <Badge className="ml-2 bg-orange-100 text-orange-800 text-xs">Recommended</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {diagnosisData.recommendedService === "professional" 
                        ? "Professional service needed for this repair" 
                        : "If DIY doesn't work, book a professional"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-2 mb-4 flex-1">
                  {(diagnosisData.recommendations?.professional || []).map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className={`h-1.5 w-1.5 rounded-full mt-2 flex-shrink-0 ${diagnosisData.recommendedService === "professional" ? "bg-orange-600" : "bg-gray-400"}`} />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full mt-auto ${diagnosisData.recommendedService === "professional" ? "bg-orange-600 hover:bg-orange-700" : "bg-gray-600 hover:bg-gray-700"}`}
                  onClick={handleBookEngineer}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Book Engineer
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="border-l-4 border-l-blue-600">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-xl">Diagnostic Results</CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Badge className={getDifficultyColor(diagnosisData.difficulty || 'moderate')}>
                  {safeCapitalize(diagnosisData.difficulty || 'moderate')} Difficulty
                </Badge>
                <Badge className={getUrgencyColor(diagnosisData.urgency || 'medium')}>
                  {safeCapitalize(diagnosisData.urgency || 'medium')} Priority
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Estimated Time</h3>
                </div>
                <p className="text-xl font-bold text-blue-600">{diagnosisData.timeEstimate || 'Varies'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">Estimated Cost</h3>
                <p className="text-xl font-bold text-green-600">{diagnosisData.estimatedCost || 'Contact for quote'}</p>
              </div>
            </div>

            {diagnosisData.safetyWarnings && diagnosisData.safetyWarnings.length > 0 && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-5 w-5" />
                  Safety Warnings
                </h3>
                <ul className="space-y-2">
                  {diagnosisData.safetyWarnings.map((warning, index) => (
                    <li key={index} className="flex items-start gap-2 text-red-700">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {diagnosisData.skillsRequired && diagnosisData.skillsRequired.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-blue-800">
                  <CheckCircle2 className="h-5 w-5" />
                  Skills Required
                </h3>
                <div className="flex flex-wrap gap-2">
                  {diagnosisData.skillsRequired.map((skill, index) => (
                    <Badge key={index} variant="outline" className="border-blue-300 text-blue-700">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Possible Causes
              </h3>
              <ul className="space-y-2">
                {(diagnosisData.possibleCauses || []).map((cause, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="h-2 w-2 rounded-full bg-orange-600 mt-2 flex-shrink-0" />
                    <span className="text-gray-700">{cause}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-center text-sm text-gray-500 border-t pt-4">
              <p>
                This is a DiagnoSys report. For accurate assessment, we recommend professional inspection for
                complex or safety-critical repairs.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-blue-200">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Lightbulb className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">DiagnoSys - Appliance Fault Assistant</CardTitle>
          <CardDescription>
            Use our DiagnoSys tool to get tailored fault diagnosis and recommended solutions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="appliance" className="text-sm font-medium">
                What appliance is having issues?
              </label>
              <Input
                id="appliance"
                placeholder="e.g., Washing machine, Refrigerator, Dishwasher..."
                value={appliance}
                onChange={(e) => setAppliance(e.target.value)}
                className="w-full text-base placeholder:text-sm"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="brand" className="text-sm font-medium">
                Appliance brand <span className="text-gray-500">(optional)</span>
              </label>
              <Input
                id="brand"
                placeholder="e.g., Bosch, Samsung, LG, Whirlpool..."
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full text-base placeholder:text-sm"
              />
              <p className="text-xs text-gray-500">
                Helpful for error codes and brand-specific diagnostics
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="problem" className="text-sm font-medium">
                Describe the problem in detail
              </label>
              <Textarea
                id="problem"
                placeholder="e.g., My washing machine makes loud banging noises during the spin cycle and clothes come out still wet. Error code E4 is showing on the display..."
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                className="w-full min-h-[100px] text-base placeholder:text-sm"
              />
              <p className="text-xs text-gray-500">
                Include any error codes if displayed on your appliance
              </p>
            </div>
            {error && !showEmailVerification && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {!showEmailVerification && (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleAskAI} className="w-full bg-blue-600 hover:bg-blue-700 h-9 sm:h-10 text-xs sm:text-sm font-medium" size="lg">
                  <Lightbulb className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  Diagnose Your Fault
                </Button>
                <Button
                  variant="outline"
                  onClick={handleShowExample}
                  className="w-full border-blue-600 text-blue-600 hover:bg-blue-50 h-9 sm:h-10 text-xs sm:text-sm font-medium"
                  size="lg"
                >
                  <Eye className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  See Example Report
                </Button>
              </div>
            )}

            {showEmailVerification && (
              <div className="border-t pt-6 space-y-4">
                <div className="flex items-center gap-2 text-blue-600">
                  <Mail className="h-5 w-5" />
                  <h3 className="font-semibold">Quick Email Verification</h3>
                  <button
                    onClick={() => setShowEmailVerification(false)}
                    className="ml-auto text-gray-400 hover:text-gray-600"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  We'll send your diagnostic report to your email and provide follow-up recommendations.
                </p>

                {!isEmailSent ? (
                  <div className="space-y-3">
                    <Input
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-base"
                    />
                    <div className="flex items-start gap-2">
                      <Checkbox id="marketing-consent-diagnostic" defaultChecked={true} className="mt-1" />
                      <label htmlFor="marketing-consent-diagnostic" className="text-xs text-gray-600 cursor-pointer">
                        I would like to receive helpful tips, special offers, and updates about appliance maintenance
                        and repair services via email. You can unsubscribe at any time.
                      </label>
                    </div>
                    {error && (
                      <div className="flex items-center gap-2 text-red-600 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                      </div>
                    )}
                    <Button onClick={handleEmailSubmit} className="w-full bg-blue-600 hover:bg-blue-700" disabled={isVerifying}>
                      {isVerifying ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending Code...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Verification Code
                        </>
                      )}
                    </Button>
                  </div>
                ) : !isEmailVerified ? (
                  <div className="space-y-3">
                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                      <p className="text-sm text-green-800">
                        <CheckCircle2 className="h-4 w-4 inline mr-1" />
                        Verification code sent to <strong>{email}</strong>
                      </p>
                    </div>
                    <div className="space-y-3">
                      <Input
                        placeholder="Enter 6-digit code"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="w-full text-center text-base tracking-wider"
                        maxLength={6}
                      />
                      <p className="text-xs text-gray-500 text-center">
                        Check your email for the 6-digit verification code
                      </p>
                      {error && (
                        <div className="flex items-center gap-2 text-red-600 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          {error}
                        </div>
                      )}
                      <Button
                        onClick={handleVerificationSubmit}
                        className="w-full bg-green-600 hover:bg-green-700"
                        disabled={isVerifying || isLoading}
                      >
                        {isVerifying || isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {isLoading ? "Getting Diagnosis..." : "Verifying..."}
                          </>
                        ) : (
                          <>
                            <KeyRound className="mr-2 h-4 w-4" />
                            Verify & Get Diagnosis
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="text-center">
                      <button
                        onClick={resendVerificationCode}
                        className="text-sm text-blue-600 hover:underline"
                        disabled={isVerifying}
                      >
                        Resend Code
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading && isEmailVerified && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <div>
                <p className="font-medium text-blue-800">DiagnoSys Is Analysing Your Appliance Problem...</p>
                <p className="text-sm text-blue-600 mt-1">This may take up to 30 seconds</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showExample && renderDiagnosticResults(exampleDiagnosis, true)}

      {diagnosis && !showExample && (
        <>
          {renderDiagnosticResults(diagnosis, false)}
          
          {/* Email Status Notification */}
          {emailSentStatus && (
            <Card className={`border-2 mt-4 ${
              emailSentStatus === 'success' ? 'border-green-200 bg-green-50' : 
              emailSentStatus === 'error' ? 'border-yellow-200 bg-yellow-50' : 
              'border-blue-200 bg-blue-50'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {emailSentStatus === 'pending' && (
                    <>
                      <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                      <p className="text-blue-800">Sending diagnostic report to your email...</p>
                    </>
                  )}
                  {emailSentStatus === 'success' && (
                    <>
                      <Mail className="h-5 w-5 text-green-600" />
                      <p className="text-green-800">
                        Diagnostic report sent to <strong>{email}</strong>. Check your inbox!
                      </p>
                    </>
                  )}
                  {emailSentStatus === 'error' && (
                    <>
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <div className="flex-1">
                        <p className="text-yellow-800">
                          Unable to send email report. Your diagnosis is saved above.
                        </p>
                        <Button
                          onClick={() => sendDiagnosticEmail(diagnosis)}
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          disabled={isSendingEmail}
                        >
                          {isSendingEmail ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Retrying...
                            </>
                          ) : (
                            <>Retry Email</>  
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

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
} from "lucide-react"
import { diagnoseProblem } from "../actions/diagnose"
import { Checkbox } from "@/components/ui/checkbox"

interface DiagnosisResult {
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

export function DiagnosticForm({ onBookEngineer }: DiagnosticFormProps) {
  const [appliance, setAppliance] = useState("")
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

  const handleAskAI = () => {
    if (!appliance.trim() || !problem.trim()) {
      setError("Please fill in both fields")
      return
    }
    setError("")
    setShowEmailVerification(true)
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError("Please enter your email address")
      return
    }

    setIsVerifying(true)
    setError("")

    // Simulate sending verification email
    setTimeout(() => {
      setIsVerifying(false)
      setIsEmailSent(true)
    }, 1500)
  }

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!verificationCode.trim()) {
      setError("Please enter the verification code")
      return
    }

    setIsVerifying(true)
    setError("")

    // Simulate verification (accept any 6-digit code for demo)
    setTimeout(() => {
      if (verificationCode.length === 6) {
        setIsVerifying(false)
        setIsEmailVerified(true)
        // Proceed with diagnosis
        handleDiagnosticSubmit()
      } else {
        setIsVerifying(false)
        setError("Please enter a valid 6-digit verification code")
      }
    }, 1000)
  }

  const handleDiagnosticSubmit = async () => {
    setIsLoading(true)
    setError("")
    setDiagnosis(null)

    try {
      const result = await diagnoseProblem(appliance, problem, email)
      setDiagnosis(result)
    } catch (err) {
      setError("Sorry, we encountered an error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const resendVerificationCode = () => {
    setIsVerifying(true)
    setTimeout(() => {
      setIsVerifying(false)
      setIsEmailSent(true)
    }, 1000)
  }

  const scrollToServices = () => {
    document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })
  }

  const handleBookEngineer = () => {
    if (onBookEngineer) {
      onBookEngineer()
    } else {
      // Fallback to scrolling to services section
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

  // Example diagnosis data
  const exampleDiagnosis: DiagnosisResult = {
    possibleCauses: [
      "Unbalanced load causing excessive vibration",
      "Worn or damaged shock absorbers",
      "Loose drum or suspension springs",
      "Foreign objects trapped in drum or pump",
      "Faulty drum bearings requiring replacement"
    ],
    recommendations: {
      diy: [
        "Redistribute clothes evenly in the drum and restart cycle",
        "Check and remove any coins, buttons, or small items from drum",
        "Ensure washing machine is level using adjustable feet",
        "Run an empty hot wash cycle to clear any soap buildup",
        "Inspect door seal for foreign objects or damage"
      ],
      professional: [
        "Drum bearing replacement if bearings are worn",
        "Shock absorber replacement and testing",
        "Suspension spring inspection and replacement",
        "Internal component diagnosis with specialized tools",
        "Safety inspection and performance testing"
      ]
    },
    urgency: "medium",
    estimatedCost: "£0 - £149",
    difficulty: "moderate",
    recommendedService: "diy",
    serviceReason: "Most drainage issues can be resolved with simple DIY steps, but if the problem persists, professional diagnosis is recommended for component replacement.",
    skillsRequired: ["Basic appliance knowledge", "Ability to access and clean drain filter", "Physical ability to move machine"],
    timeEstimate: "30-60 minutes",
    safetyWarnings: [
      "Always disconnect power before attempting any inspection",
      "Ensure appliance is completely drained before accessing filters",
      "Never attempt repairs on live electrical components"
    ]
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-blue-200">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Lightbulb className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">AI Appliance Diagnostics</CardTitle>
          <CardDescription>
            Tell us about your appliance problem and we'll help identify potential causes and recommend the best
            solution
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
                className="w-full text-base"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="problem" className="text-sm font-medium">
                Describe the problem in detail
              </label>
              <Textarea
                id="problem"
                placeholder="e.g., My washing machine makes loud banging noises during the spin cycle and clothes come out still wet..."
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                className="w-full min-h-[100px] text-base"
              />
            </div>
            {error && !showEmailVerification && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {!showEmailVerification && (
              <div className="space-y-3">
                <Button onClick={handleAskAI} className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
                  <Lightbulb className="mr-2 h-4 w-4" />
                  Ask AI
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    alert("Button clicked! Modal should open now...")
                    setShowExample(true)
                  }}
                  className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  See Example Diagnosis
                </Button>
              </div>
            )}

            {/* Email Verification Section */}
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
                  <form onSubmit={handleEmailSubmit} className="space-y-3">
                    <Input
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-base"
                      required
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
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isVerifying}>
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
                  </form>
                ) : !isEmailVerified ? (
                  <div className="space-y-3">
                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                      <p className="text-sm text-green-800">
                        <CheckCircle2 className="h-4 w-4 inline mr-1" />
                        Verification code sent to <strong>{email}</strong>
                      </p>
                    </div>
                    <form onSubmit={handleVerificationSubmit} className="space-y-3">
                      <Input
                        placeholder="Enter 6-digit code"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="w-full text-center text-base tracking-wider"
                        maxLength={6}
                        required
                      />
                      <p className="text-xs text-gray-500 text-center">
                        For demo: enter any 6-digit code (e.g., 123456)
                      </p>
                      {error && (
                        <div className="flex items-center gap-2 text-red-600 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          {error}
                        </div>
                      )}
                      <Button
                        type="submit"
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
                    </form>
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

      {/* Loading State */}
      {isLoading && isEmailVerified && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <div>
                <p className="font-medium text-blue-800">AI Analyzing Your Appliance Problem...</p>
                <p className="text-sm text-blue-600 mt-1">This may take a few seconds</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {diagnosis && (
        <div className="space-y-6">
          {/* Updated Email Verified Success */}
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

          {/* Service Recommendation Card - Only show for warranty recommendation */}
          {diagnosis.recommendedService === "warranty" && (
            <Card className={`border-l-4 ${getServiceRecommendation(diagnosis.recommendedService).color}`}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    {getServiceRecommendation(diagnosis.recommendedService).icon}
                    <div className="flex-1">
                      <CardTitle className="text-xl">
                        {getServiceRecommendation(diagnosis.recommendedService).title}
                      </CardTitle>
                      <CardDescription className="mt-1">{diagnosis.serviceReason}</CardDescription>
                    </div>
                  </div>
                  <Button
                    className={`${getServiceRecommendation(diagnosis.recommendedService).buttonColor} text-white w-full sm:w-auto`}
                    onClick={getServiceRecommendation(diagnosis.recommendedService).buttonAction}
                  >
                    {getServiceRecommendation(diagnosis.recommendedService).buttonText}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* For DIY and Professional recommendations, show dual options */}
          {(diagnosis.recommendedService === "diy" || diagnosis.recommendedService === "professional") && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* DIY Option Card */}
              <Card className={`border-l-4 flex flex-col ${diagnosis.recommendedService === "diy" ? "border-l-blue-600 bg-blue-50" : "border-l-gray-300 bg-gray-50"}`}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Wrench className={`h-5 w-5 ${diagnosis.recommendedService === "diy" ? "text-blue-600" : "text-gray-600"}`} />
                    <div className="flex-1">
                      <CardTitle className={`text-lg ${diagnosis.recommendedService === "diy" ? "text-blue-800" : "text-gray-700"}`}>
                        Try DIY First
                        {diagnosis.recommendedService === "diy" && (
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
                    {diagnosis.recommendations.diy.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <div className={`h-1.5 w-1.5 rounded-full mt-2 flex-shrink-0 ${diagnosis.recommendedService === "diy" ? "bg-blue-600" : "bg-gray-400"}`} />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={diagnosis.recommendedService === "diy" ? "default" : "outline"}
                    className={`w-full mt-auto ${diagnosis.recommendedService === "diy" ? "bg-blue-600 hover:bg-blue-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
                    onClick={handleFindParts}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Find Parts
                  </Button>
                </CardContent>
              </Card>

              {/* Professional Option Card */}
              <Card className={`border-l-4 flex flex-col ${diagnosis.recommendedService === "professional" ? "border-l-orange-600 bg-orange-50" : "border-l-gray-300 bg-gray-50"}`}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Calendar className={`h-5 w-5 ${diagnosis.recommendedService === "professional" ? "text-orange-600" : "text-gray-600"}`} />
                    <div className="flex-1">
                      <CardTitle className={`text-lg ${diagnosis.recommendedService === "professional" ? "text-orange-800" : "text-gray-700"}`}>
                        Book an Engineer
                        {diagnosis.recommendedService === "professional" && (
                          <Badge className="ml-2 bg-orange-100 text-orange-800 text-xs">Recommended</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {diagnosis.recommendedService === "professional" 
                          ? "Professional service needed for this repair" 
                          : "If DIY doesn't work, book a professional"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-2 mb-4 flex-1">
                    {diagnosis.recommendations.professional.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <div className={`h-1.5 w-1.5 rounded-full mt-2 flex-shrink-0 ${diagnosis.recommendedService === "professional" ? "bg-orange-600" : "bg-gray-400"}`} />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full mt-auto ${diagnosis.recommendedService === "professional" ? "bg-orange-600 hover:bg-orange-700" : "bg-gray-600 hover:bg-gray-700"}`}
                    onClick={handleBookEngineer}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Book Engineer
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Diagnostic Details */}
          <Card className="border-l-4 border-l-blue-600">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-xl">Diagnostic Results</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Badge className={getDifficultyColor(diagnosis.difficulty)}>
                    {diagnosis.difficulty.charAt(0).toUpperCase() + diagnosis.difficulty.slice(1)} Difficulty
                  </Badge>
                  <Badge className={getUrgencyColor(diagnosis.urgency)}>
                    {diagnosis.urgency.charAt(0).toUpperCase() + diagnosis.urgency.slice(1)} Priority
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Key Information Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-gray-600" />
                    <h3 className="font-semibold">Estimated Time</h3>
                  </div>
                  <p className="text-lg font-bold text-blue-600">{diagnosis.timeEstimate}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Estimated Cost</h3>
                  <p className="text-lg font-bold text-green-600">{diagnosis.estimatedCost}</p>
                </div>
              </div>

              {/* Safety Warnings */}
              {diagnosis.safetyWarnings && diagnosis.safetyWarnings.length > 0 && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-red-800">
                    <AlertTriangle className="h-5 w-5" />
                    Safety Warnings
                  </h3>
                  <ul className="space-y-2">
                    {diagnosis.safetyWarnings.map((warning, index) => (
                      <li key={index} className="flex items-start gap-2 text-red-700">
                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Skills Required (for DIY) */}
              {diagnosis.skillsRequired && diagnosis.skillsRequired.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-blue-800">
                    <CheckCircle2 className="h-5 w-5" />
                    Skills Required
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {diagnosis.skillsRequired.map((skill, index) => (
                      <Badge key={index} variant="outline" className="border-blue-300 text-blue-700">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Possible Causes */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  Possible Causes
                </h3>
                <ul className="space-y-2">
                  {diagnosis.possibleCauses.map((cause, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-orange-600 mt-2 flex-shrink-0" />
                      <span className="text-gray-700">{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="text-center text-sm text-gray-500 border-t pt-4">
                <p>
                  This is an AI-generated diagnosis. For accurate assessment, we recommend professional inspection for
                  complex or safety-critical repairs.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

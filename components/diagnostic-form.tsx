"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  AlertCircle, 
  Lightbulb, 
  Loader2, 
  Wrench, 
  Search, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Mail, 
  KeyRound, 
  ChevronUp, 
  Eye, 
  X, 
  Code 
} from "lucide-react"

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

export function DiagnosticForm() {
  const [appliance, setAppliance] = useState("")
  const [brand, setBrand] = useState("")
  const [errorCode, setErrorCode] = useState("")
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

  const handleAskAI = () => {
    if (!appliance.trim() || !problem.trim()) {
      setError("Please fill in appliance type and problem description")
      return
    }
    setError("")
    setShowEmailVerification(true)
  }

  const handleEmailSubmit = () => {
    if (!email.trim()) {
      setError("Please enter your email address")
      return
    }

    setIsVerifying(true)
    setError("")

    setTimeout(() => {
      setIsVerifying(false)
      setIsEmailSent(true)
    }, 1500)
  }

  const handleVerificationSubmit = () => {
    if (!verificationCode.trim()) {
      setError("Please enter the verification code")
      return
    }

    setIsVerifying(true)
    setError("")

    setTimeout(() => {
      if (verificationCode.length === 6) {
        setIsVerifying(false)
        setIsEmailVerified(true)
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
      // This is the key part: combine error code with problem description
      const fullProblem = errorCode 
        ? `${problem}${problem ? ' ' : ''}Error code: ${errorCode}`
        : problem
        
      // In your real implementation, you would call:
      // const result = await diagnoseProblem(appliance, brand, fullProblem, email)
      
      // Demo simulation
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const result: DiagnosisResult = {
        possibleCauses: errorCode 
          ? [`Error code ${errorCode} detected on ${brand || 'appliance'} ${appliance.toLowerCase()}`, "Control board communication error", "Component malfunction requiring professional diagnosis"]
          : ["Component wear and tear", "Internal sensor malfunction", "Electrical connection issues"],
        recommendations: {
          diy: errorCode 
            ? ["Power cycle the appliance (unplug for 2 minutes)", "Check user manual for error code information", "Verify all connections are secure"]
            : ["Check power connections", "Inspect for obvious blockages", "Verify settings are correct"],
          professional: ["Professional diagnostic inspection with specialized equipment", "Component replacement using genuine parts", "Complete system testing after repair"]
        },
        urgency: "medium",
        estimatedCost: "£109 - £149",
        difficulty: errorCode ? "expert" : "moderate",
        recommendedService: errorCode ? "professional" : "professional",
        serviceReason: errorCode 
          ? `Error code ${errorCode} on ${brand || 'this'} ${appliance.toLowerCase()} requires professional diagnosis with specialized equipment to identify the exact component failure.`
          : "This issue requires professional assessment to ensure safe and proper repair.",
        skillsRequired: errorCode ? ["Specialized diagnostic tools", "Brand-specific technical knowledge"] : ["Basic tools", "Technical knowledge"],
        timeEstimate: "1 - 2 hours",
        safetyWarnings: ["Always disconnect power before attempting any inspection", errorCode ? "Error codes often indicate electrical or safety-critical faults" : "Professional service recommended for safety"]
      }
      
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

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high": return "bg-red-100 text-red-800"
      case "medium": return "bg-yellow-100 text-yellow-800"
      case "low": return "bg-green-100 text-green-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-100 text-green-800"
      case "moderate": return "bg-blue-100 text-blue-800"
      case "difficult": return "bg-orange-100 text-orange-800"
      case "expert": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card className="border-2 border-blue-200">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Lightbulb className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">kAI - Appliance Fault Assistant</CardTitle>
          <CardDescription>
            Tell kAI about your appliance and get a detailed fault diagnosis and recommended best solutions
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
              <label htmlFor="brand" className="text-sm font-medium">
                Appliance brand <span className="text-gray-500">(optional)</span>
              </label>
              <Input
                id="brand"
                placeholder="e.g., Bosch, Samsung, LG, Whirlpool..."
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full text-base"
              />
              <p className="text-xs text-gray-500">
                Helpful for error codes and brand-specific diagnostics
              </p>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="errorCode" className="text-sm font-medium flex items-center gap-2">
                <Code className="h-4 w-4" />
                Error code <span className="text-gray-500">(if displayed)</span>
              </label>
              <Input
                id="errorCode"
                placeholder="e.g., E17, F05, 4E, OE..."
                value={errorCode}
                onChange={(e) => setErrorCode(e.target.value.toUpperCase())}
                className="w-full text-base font-mono"
              />
              <p className="text-xs text-gray-500">
                If your appliance shows an error code on the display, enter it here for more accurate diagnosis
              </p>
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
              <Button onClick={handleAskAI} className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
                <Lightbulb className="mr-2 h-4 w-4" />
                Diagnose Your Fault
              </Button>
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
                      <Checkbox id="marketing-consent" defaultChecked={true} className="mt-1" />
                      <label htmlFor="marketing-consent" className="text-xs text-gray-600 cursor-pointer">
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
                    <Input
                      placeholder="Enter 6-digit code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="w-full text-center text-base tracking-wider"
                      maxLength={6}
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
                <p className="font-medium text-blue-800">kAI Analyzing Your Appliance Problem...</p>
                <p className="text-sm text-blue-600 mt-1">This may take a few seconds</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {diagnosis && (
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
            <div className="grid gap-6 md:grid-cols-2">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Estimated Time</h3>
                </div>
                <p className="text-xl font-bold text-blue-600">{diagnosis.timeEstimate}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">Estimated Cost</h3>
                <p className="text-xl font-bold text-green-600">{diagnosis.estimatedCost}</p>
              </div>
            </div>

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

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-blue-600" />
                  DIY Solutions
                </h4>
                <ul className="space-y-2">
                  {diagnosis.recommendations.diy.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  Professional Service
                </h4>
                <ul className="space-y-2">
                  {diagnosis.recommendations.professional.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-orange-600 mt-2 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Recommendation</h4>
              <p className="text-blue-700">{diagnosis.serviceReason}</p>
            </div>

            <div className="text-center text-sm text-gray-500 border-t pt-4">
              <p>
                This is a kAI-generated diagnosis. For accurate assessment, we recommend professional inspection for
                complex or safety-critical repairs.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

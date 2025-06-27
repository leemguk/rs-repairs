"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Shield, CheckCircle, X, ChevronRight, ArrowLeft, Mail, Home, User } from "lucide-react"

interface WarrantyModalProps {
  isOpen: boolean
  onClose: () => void
}

interface QuoteData {
  selectedPlan: "single" | "double" | "multiple" | null
  firstName: string
  lastName: string
  email: string
  phone: string
  postcode: string
  address: string
  appliances: Array<{
    type: string
    brand: string
    model: string
    age: string
  }>
  marketingConsent: boolean
}

const warrantyPlans = [
  {
    id: "single",
    title: "Cover 1 Appliance",
    discount: "20% DISCOUNT",
    duration: "for 6 months",
    code: "RAN20%",
    color: "bg-blue-50 border-blue-200",
    buttonColor: "bg-green-600 hover:bg-green-700",
  },
  {
    id: "double",
    title: "Cover 2 Appliances",
    discount: "25% DISCOUNT",
    duration: "for 6 months",
    code: "RAN25%",
    color: "bg-green-50 border-green-200",
    buttonColor: "bg-green-600 hover:bg-green-700",
  },
  {
    id: "multiple",
    title: "Cover 3+ Appliances",
    discount: "30% DISCOUNT",
    duration: "for 6 months",
    code: "RAN30%",
    color: "bg-orange-50 border-orange-200",
    buttonColor: "bg-green-600 hover:bg-green-700",
    popular: true,
  },
]

const applianceTypes = [
  "Washing Machine",
  "Dishwasher",
  "Refrigerator",
  "Oven",
  "Tumble Dryer",
  "Cooker",
  "Microwave",
  "Freezer",
  "Hob",
  "Extractor Fan",
]

const applianceBrands = [
  "Bosch",
  "Samsung",
  "LG",
  "Whirlpool",
  "Hotpoint",
  "Beko",
  "AEG",
  "Siemens",
  "Indesit",
  "Zanussi",
  "Miele",
  "Neff",
  "Other",
]

export function WarrantyModal({ isOpen, onClose }: WarrantyModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [quoteData, setQuoteData] = useState<QuoteData>({
    selectedPlan: null,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    postcode: "",
    address: "",
    appliances: [{ type: "", brand: "", model: "", age: "" }],
    marketingConsent: true,
  })

  const updateQuoteData = (field: keyof QuoteData, value: any) => {
    setQuoteData((prev) => ({ ...prev, [field]: value }))
  }

  const addAppliance = () => {
    setQuoteData((prev) => ({
      ...prev,
      appliances: [...prev.appliances, { type: "", brand: "", model: "", age: "" }],
    }))
  }

  const updateAppliance = (index: number, field: string, value: string) => {
    setQuoteData((prev) => ({
      ...prev,
      appliances: prev.appliances.map((appliance, i) => (i === index ? { ...appliance, [field]: value } : appliance)),
    }))
  }

  const removeAppliance = (index: number) => {
    if (quoteData.appliances.length > 1) {
      setQuoteData((prev) => ({
        ...prev,
        appliances: prev.appliances.filter((_, i) => i !== index),
      }))
    }
  }

  const nextStep = () => {
    if (currentStep < 2) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const handleSubmit = () => {
    console.log("Quote submitted:", quoteData)
    alert("Thank you! We'll send your personalized quote within 24 hours.")
    onClose()
    // Reset form
    setCurrentStep(1)
    setQuoteData({
      selectedPlan: null,
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      postcode: "",
      address: "",
      appliances: [{ type: "", brand: "", model: "", age: "" }],
      marketingConsent: true,
    })
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <p className="text-gray-600">
          Protect those kitchen essentials you rely on every day. Whether it's your washing machine or cooker,
          dishwasher or fridge freezer, you wouldn't want to be without these appliances, so it makes sense to protect
          them in case something goes wrong.
        </p>
      </div>

      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">What's on offer?</h3>

        <div className="grid gap-4 md:grid-cols-3">
          {warrantyPlans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${
                quoteData.selectedPlan === plan.id ? "ring-2 ring-green-500 border-green-500" : plan.color
              }`}
              onClick={() => updateQuoteData("selectedPlan", plan.id)}
            >
              {plan.popular && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-orange-600 text-white">Most Popular</Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-lg font-bold text-gray-800">{plan.title.toUpperCase()}</CardTitle>
              </CardHeader>

              <CardContent className="text-center space-y-4">
                <div>
                  <div className="text-lg font-bold text-gray-900">{plan.discount}</div>
                  <div className="text-sm text-gray-600">{plan.duration}</div>
                </div>

                <div className="bg-white/80 p-2 rounded border">
                  <div className="text-xs text-gray-600">Use this code:</div>
                  <div className="font-bold text-green-600">{plan.code}</div>
                </div>

                <Button
                  className={`w-full ${plan.buttonColor} text-white`}
                  onClick={(e) => {
                    e.stopPropagation()
                    updateQuoteData("selectedPlan", plan.id)
                    nextStep()
                  }}
                >
                  Get quote now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Coverage Details */}
      <div className="space-y-6 bg-gray-50 p-6 rounded-lg">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            What is covered?
          </h3>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                Cover for electrical and mechanical failures, even if caused by accidental damage
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700">Expert assistance from a nationwide network of engineers</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                Call a dedicated, UK based helpline in the event of a problem
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                Claim as many times as you need - your claims limit per claim is up to the original price paid for the
                appliance
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                All parts, labour and call-out fees are included, so there'll be no hidden surprises
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                If your appliance can't be fixed, you'll be covered for the cost of a brand new replacement
              </span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <X className="h-5 w-5 text-red-600" />
            What are the policy exclusions?
          </h3>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                Appliances used for a non-domestic purpose or in a commercial environment
              </span>
            </div>
            <div className="flex items-start gap-2">
              <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                Faults that exist before the start of the policy, or that are due to a genetic manufacturing defect e.g.
                Product recall
              </span>
            </div>
            <div className="flex items-start gap-2">
              <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                Any fault or damage caused by any theft, attempted theft, malicious damage or damage caused by fire or
                explosion
              </span>
            </div>
            <div className="flex items-start gap-2">
              <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                Costs of rearranging missed appointments with engineers, or installation, de-installation or scrappage
                costs of the appliance
              </span>
            </div>
            <div className="flex items-start gap-2">
              <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                A 28 days exclusion period applies from when you purchase your policy when you will not be covered
              </span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Is this cover right for you?</h3>
          <p className="text-sm text-gray-600 mb-3">
            Before you apply for cover for your appliances, we just need to check a few things...
          </p>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
              <span className="text-sm text-gray-700">
                Are all your appliances outside their manufacturer warranty?
              </span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
              <span className="text-sm text-gray-700">
                Have you checked your appliances are not already covered elsewhere?
              </span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
              <span className="text-sm text-gray-700">
                Are all your appliances owned by you and less than seven years old?
              </span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
              <span className="text-sm text-gray-700">
                Are you looking to cover your appliances against breakdown caused by mechanical or electrical failure?
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            If you've answered "yes" to all of the above then it sounds like your requirements are of a person looking
            to cover their Kitchen Appliances.
          </p>
        </div>
      </div>

      <div className="flex justify-center">
        <Button onClick={nextStep} className="bg-green-600 hover:bg-green-700 px-8" disabled={!quoteData.selectedPlan}>
          Continue to Quote Form
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={prevStep} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Get Your Personalized Quote</h2>
          <p className="text-sm text-gray-600">
            Selected: {warrantyPlans.find((p) => p.id === quoteData.selectedPlan)?.title}(
            {warrantyPlans.find((p) => p.id === quoteData.selectedPlan)?.discount})
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Personal Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={quoteData.firstName}
                  onChange={(e) => updateQuoteData("firstName", e.target.value)}
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={quoteData.lastName}
                  onChange={(e) => updateQuoteData("lastName", e.target.value)}
                  placeholder="Smith"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                value={quoteData.email}
                onChange={(e) => updateQuoteData("email", e.target.value)}
                placeholder="john.smith@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone <span className="text-red-500">*</span>
              </label>
              <Input
                type="tel"
                value={quoteData.phone}
                onChange={(e) => updateQuoteData("phone", e.target.value)}
                placeholder="07123 456789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Postcode <span className="text-red-500">*</span>
              </label>
              <Input
                value={quoteData.postcode}
                onChange={(e) => updateQuoteData("postcode", e.target.value)}
                placeholder="SW1A 1AA"
              />
            </div>
          </CardContent>
        </Card>

        {/* Appliance Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-green-600" />
              Your Appliances
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {quoteData.appliances.map((appliance, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Appliance {index + 1}</h4>
                  {quoteData.appliances.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAppliance(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                    <Select value={appliance.type} onValueChange={(value) => updateAppliance(index, "type", value)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {applianceTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Brand</label>
                    <Select value={appliance.brand} onValueChange={(value) => updateAppliance(index, "brand", value)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {applianceBrands.map((brand) => (
                          <SelectItem key={brand} value={brand}>
                            {brand}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Model</label>
                    <Input
                      className="h-8 text-sm"
                      value={appliance.model}
                      onChange={(e) => updateAppliance(index, "model", e.target.value)}
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Age</label>
                    <Select value={appliance.age} onValueChange={(value) => updateAppliance(index, "age", value)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0-1">0-1 years</SelectItem>
                        <SelectItem value="1-2">1-2 years</SelectItem>
                        <SelectItem value="2-3">2-3 years</SelectItem>
                        <SelectItem value="3-4">3-4 years</SelectItem>
                        <SelectItem value="4-5">4-5 years</SelectItem>
                        <SelectItem value="5-6">5-6 years</SelectItem>
                        <SelectItem value="6-7">6-7 years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addAppliance} className="w-full border-dashed">
              + Add Another Appliance
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Marketing Consent */}
      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
        <Checkbox
          id="marketing-consent"
          checked={quoteData.marketingConsent}
          onCheckedChange={(checked) => updateQuoteData("marketingConsent", checked)}
          className="mt-1"
        />
        <label htmlFor="marketing-consent" className="text-sm text-gray-700 cursor-pointer">
          I would like to receive helpful tips, special offers, and updates about appliance warranty and insurance
          services via email and SMS. You can unsubscribe at any time.
        </label>
      </div>

      {/* Submit */}
      <div className="flex justify-center">
        <Button
          onClick={handleSubmit}
          className="bg-green-600 hover:bg-green-700 px-8"
          disabled={
            !quoteData.firstName ||
            !quoteData.lastName ||
            !quoteData.email ||
            !quoteData.phone ||
            !quoteData.postcode ||
            quoteData.appliances.some((a) => !a.type || !a.brand || !a.age)
          }
        >
          Get My Personalized Quote
          <Mail className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-6xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="sr-only">Appliance Warranty Quote</DialogTitle>
        </DialogHeader>

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
      </DialogContent>
    </Dialog>
  )
}

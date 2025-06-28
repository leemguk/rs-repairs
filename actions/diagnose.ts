"use server"

import { supabase } from '@/lib/supabase'

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

// Enhanced error code detection
function detectErrorCode(problem: string): string | null {
  const problemLower = problem.toLowerCase()
  
  const errorCodePatterns = [
    /\berror\s+code\s*[:\-]?\s*([a-z]?\d{1,3}[a-z]?)\b/gi,
    /\bcode\s*[:\-]?\s*([a-z]?\d{1,3}[a-z]?)\b/gi,
    /\b[ef][-]?(\d{1,3}[a-z]?)\b/gi,
    /\b(\d{1,2}[ef])\b/gi,  // Samsung: 4E, 5E
    /\b([a-z]{1,2}\d{1,2})\b/gi,  // LG: OE, IE, Beko: E4
  ]
  
  for (const pattern of errorCodePatterns) {
    const matches = problemLower.match(pattern)
    if (matches) {
      const code = matches[0].replace(/^(error\s+code|code)\s*[:\-]?\s*/i, '').toUpperCase()
      return code
    }
  }
  
  return null
}

// Websearch-enabled error code lookup with validation
async function lookupErrorCodeWithWebsearch(
  errorCode: string, 
  brand: string, 
  appliance: string, 
  apiKey: string
): Promise<DiagnosisResult | null> {
  try {
    console.log(`Looking up error code ${errorCode} for ${brand} ${appliance} with websearch`)
    
    // First, get the specific meaning of this error code
    const lookupPrompt = `What does error code ${errorCode} specifically mean on a ${brand} ${appliance}? I need the exact technical meaning of this error code for this brand.`

    const lookupResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "RS Repairs Error Code Lookup"
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet:online', // FIXED: Using correct websearch model
        messages: [{ role: "user", content: lookupPrompt }],
        max_tokens: 300,
        temperature: 0.1
      })
    })

    if (!lookupResponse.ok) {
      console.error(`Lookup API error: ${lookupResponse.status}`)
      return null
    }

    const lookupData = await lookupResponse.json()
    const errorMeaning = lookupData.choices[0]?.message?.content?.trim()
    
    if (!errorMeaning) {
      console.error('No error meaning returned')
      return null
    }

    console.log(`Error meaning found: ${errorMeaning}`)
    
    // Validate that we got specific information (not generic)
    if (errorMeaning.toLowerCase().includes('component malfunction') || 
        errorMeaning.toLowerCase().includes('sensor failure') ||
        !errorMeaning.toLowerCase().includes(errorCode.toLowerCase())) {
      console.log('Got generic response, using fallback')
      return null
    }

    // Now get detailed diagnosis based on the specific error meaning
    const diagnosisPrompt = `Based on this specific error code information: "${errorMeaning}"

For a ${brand} ${appliance} showing error code ${errorCode}, provide:

CAUSES: List 3-4 specific possible causes for this exact error
SERVICE: State if this is typically "diy" or "professional" 
COST: Estimated repair cost range in £
DIFFICULTY: Rate as easy/moderate/difficult/expert
URGENCY: Rate as low/medium/high
REASON: Explain why DIY or professional service is recommended
SAFETY: Any specific safety warnings for this error

Be specific to what error code ${errorCode} actually means for ${brand} appliances.`

    const diagnosisResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "RS Repairs Error Diagnosis"
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet', // No websearch needed for diagnosis
        messages: [{ role: "user", content: diagnosisPrompt }],
        max_tokens: 500,
        temperature: 0.1
      })
    })

    if (!diagnosisResponse.ok) {
      console.error(`Diagnosis API error: ${diagnosisResponse.status}`)
      return null
    }

    const diagnosisData = await diagnosisResponse.json()
    const diagnosis = diagnosisData.choices[0]?.message?.content?.trim()
    
    if (!diagnosis) {
      console.error('No diagnosis returned')
      return null
    }

    console.log(`AI diagnosis: ${diagnosis}`)
    
    // Parse the structured response
    return parseStructuredResponse(diagnosis, errorCode, brand, appliance, errorMeaning)

  } catch (error) {
    console.error(`Error in websearch lookup:`, error)
    return null
  }
}

// Parse structured AI response into DiagnosisResult format
function parseStructuredResponse(
  response: string, 
  errorCode: string, 
  brand: string, 
  appliance: string,
  errorMeaning: string
): DiagnosisResult {
  const lines = response.split('\n').map(line => line.trim())
  
  // Extract structured data
  const causesLine = lines.find(line => line.toUpperCase().startsWith('CAUSES:'))
  const serviceLine = lines.find(line => line.toUpperCase().startsWith('SERVICE:'))
  const costLine = lines.find(line => line.toUpperCase().startsWith('COST:'))
  const difficultyLine = lines.find(line => line.toUpperCase().startsWith('DIFFICULTY:'))
  const urgencyLine = lines.find(line => line.toUpperCase().startsWith('URGENCY:'))
  const reasonLine = lines.find(line => line.toUpperCase().startsWith('REASON:'))
  const safetyLine = lines.find(line => line.toUpperCase().startsWith('SAFETY:'))
  
  // Clean and shorten error meaning for causes
  const cleanErrorMeaning = errorMeaning
    .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
    .replace(/\([^)]*\)/g, '') // Remove parenthetical content
    .trim()
    .substring(0, 100) // Limit length
  
  // Parse causes - keep them short and specific
  let possibleCauses = [`${brand} ${appliance} error code ${errorCode} - water fill problem`]
  if (causesLine) {
    const extractedCauses = causesLine.replace(/^CAUSES:\s*/i, '')
      .split(/[,;]/)
      .map(cause => cause.trim().substring(0, 80)) // Limit cause length
      .filter(cause => cause.length > 0)
      .slice(0, 3)
    possibleCauses = [...possibleCauses, ...extractedCauses]
  } else {
    // Default causes for water fill issues
    possibleCauses = [
      `${brand} ${appliance} error code ${errorCode} - water fill problem`,
      "Water supply valve closed or restricted",
      "Inlet hose blocked, kinked, or disconnected", 
      "Door not properly closed or door lock fault"
    ]
  }
  
  // Parse service recommendation
  const serviceText = serviceLine ? serviceLine.replace(/^SERVICE:\s*/i, '').toLowerCase() : 'professional'
  const recommendedService = serviceText.includes('diy') ? 'diy' : 'professional'
  
  // Parse difficulty
  const difficultyText = difficultyLine ? difficultyLine.replace(/^DIFFICULTY:\s*/i, '').toLowerCase() : 'expert'
  let difficulty: "easy" | "moderate" | "difficult" | "expert" = 'expert'
  if (difficultyText.includes('easy')) difficulty = 'easy'
  else if (difficultyText.includes('moderate')) difficulty = 'moderate'
  else if (difficultyText.includes('difficult')) difficulty = 'difficult'
  
  // Parse urgency
  const urgencyText = urgencyLine ? urgencyLine.replace(/^URGENCY:\s*/i, '').toLowerCase() : 'medium'
  let urgency: "low" | "medium" | "high" = 'medium'
  if (urgencyText.includes('low')) urgency = 'low'
  else if (urgencyText.includes('high')) urgency = 'high'
  
  // Parse and fix cost formatting
  let estimatedCost = '£109 - £149'
  if (costLine) {
    const costText = costLine.replace(/^COST:\s*/i, '').trim()
    if (costText && costText !== '£' && costText.length > 1) {
      estimatedCost = costText.includes('£') ? costText : `£${costText}`
    }
  }
  // For DIY water fill issues, lower cost estimate
  if (recommendedService === 'diy') {
    estimatedCost = '£0 - £50'
  }
  
  // Parse reason
  const serviceReason = reasonLine 
    ? reasonLine.replace(/^REASON:\s*/i, '').substring(0, 200)
    : recommendedService === 'diy' 
    ? `Error code ${errorCode} often indicates water supply issues that can be checked by the user before calling a professional.`
    : `Error code ${errorCode} requires professional diagnosis with specialized equipment for accurate repair.`
  
  // Parse safety warnings - keep them concise
  let safetyWarnings = [
    "Always disconnect power before attempting any inspection",
    "If unsure about any step, contact professional service"
  ]
  if (safetyLine) {
    const extractedSafety = safetyLine.replace(/^SAFETY:\s*/i, '')
      .split(/[,;]/)
      .map(warning => warning.trim().substring(0, 80))
      .filter(warning => warning.length > 0)
      .slice(0, 2)
    if (extractedSafety.length > 0) {
      safetyWarnings = [...safetyWarnings, ...extractedSafety]
    }
  }
  
  // Generate specific recommendations based on error meaning
  const diyRecommendations = generateDIYRecommendations(cleanErrorMeaning, recommendedService)
  const professionalRecommendations = [
    `Professional diagnosis of ${brand} ${appliance} error code ${errorCode}`,
    "Specialized diagnostic equipment to identify exact component failure",
    "Brand-specific repair procedures using genuine parts",
    "Complete system testing and warranty-backed repair"
  ]
  
  return {
    possibleCauses,
    recommendations: {
      diy: diyRecommendations,
      professional: professionalRecommendations
    },
    urgency,
    estimatedCost,
    difficulty,
    recommendedService,
    serviceReason,
    skillsRequired: recommendedService === "diy" 
      ? ["Basic tools", "Manual reading", "Safety awareness"]
      : ["Specialized diagnostic equipment", "Brand-specific technical knowledge"],
    timeEstimate: recommendedService === "diy" ? "30 - 60 minutes" : "1 - 2 hours",
    safetyWarnings: safetyWarnings.slice(0, 3) // Limit to 3 warnings max
  }
}

// Generate specific DIY recommendations based on error meaning
function generateDIYRecommendations(errorMeaning: string, recommendedService: string): string[] {
  const errorLower = errorMeaning.toLowerCase()
  
  // Water fill issues (E4 on Beko) - these are often DIY-checkable
  if (errorLower.includes('water') && (errorLower.includes('fill') || errorLower.includes('intake'))) {
    if (recommendedService === 'diy') {
      return [
        "Check that water supply taps are fully turned on",
        "Inspect inlet hose for kinks or blockages",
        "Ensure door is properly closed and latched",
        "Check water pressure is adequate (if recently changed)"
      ]
    } else {
      return [
        "Check water supply taps are fully turned on (safe user check)",
        "Verify door is properly closed and latched",
        "Power cycle the appliance (unplug for 2 minutes)",
        "Professional diagnosis recommended for internal water valve issues"
      ]
    }
  }
  
  // Drainage issues
  if (errorLower.includes('drain') || errorLower.includes('pump')) {
    return [
      "Check and clean the drain pump filter",
      "Inspect drain hose for kinks or blockages", 
      "Ensure drain hose is positioned correctly",
      "Run an empty cycle to test drainage"
    ]
  }
  
  // Heating issues
  if (errorLower.includes('heat') || errorLower.includes('temperature')) {
    return [
      "Check that hot water supply is working",
      "Verify temperature settings are correct",
      "Power cycle the appliance (unplug for 2 minutes)",
      "Professional service recommended for heating element issues"
    ]
  }
  
  // Door issues
  if (errorLower.includes('door') || errorLower.includes('lock')) {
    return [
      "Ensure door is properly closed and aligned",
      "Check for obstructions around door seal",
      "Clean door latch and strike mechanism",
      "Try opening and closing door firmly several times"
    ]
  }
  
  // For professional service recommendations
  if (recommendedService === 'professional') {
    return [
      "Power cycle the appliance (unplug for 2 minutes)",
      "Check that all connections are secure",
      "Verify appliance settings are correct",
      "Professional service recommended for this error code"
    ]
  }
  
  // Default DIY recommendations
  return [
    "Power cycle the appliance (unplug for 2 minutes)",
    "Check all connections and settings",
    "Consult user manual for basic troubleshooting",
    "Contact professional service if issue persists"
  ]
}

// Main diagnosis function
export async function diagnoseProblem(
  appliance: string, 
  brand: string, 
  problem: string, 
  email: string
): Promise<DiagnosisResult> {
  try {
    const openRouterApiKey = process.env.OPENROUTER_API_KEY

    if (!openRouterApiKey) {
      console.error('OpenRouter API key not found')
      const fallbackResult = getFallbackDiagnosis(appliance, brand, problem)
      await saveDiagnosticToDatabase(appliance, brand, problem, email, fallbackResult)
      return fallbackResult
    }

    // Step 1: Check for error codes
    const detectedErrorCode = detectErrorCode(problem)
    
    if (detectedErrorCode && brand) {
      console.log(`Detected error code: ${detectedErrorCode} for ${brand} ${appliance}`)
      
      // Use websearch for error code lookup
      const websearchResult = await lookupErrorCodeWithWebsearch(
        detectedErrorCode, 
        brand, 
        appliance, 
        openRouterApiKey
      )
      
      if (websearchResult) {
        console.log('Websearch diagnosis successful')
        await saveDiagnosticToDatabase(appliance, brand, problem, email, websearchResult)
        return websearchResult
      }
      
      console.log('Websearch failed, using error code fallback')
      const errorCodeFallback = getErrorCodeFallback(detectedErrorCode, appliance, brand, problem)
      await saveDiagnosticToDatabase(appliance, brand, problem, email, errorCodeFallback)
      return errorCodeFallback
    }
    
    // Step 2: Fallback for non-error-code issues
    const fallbackResult = getFallbackDiagnosis(appliance, brand, problem)
    await saveDiagnosticToDatabase(appliance, brand, problem, email, fallbackResult)
    return fallbackResult

  } catch (error) {
    console.error("Diagnosis error:", error)
    const fallbackResult = getFallbackDiagnosis(appliance, brand, problem)
    await saveDiagnosticToDatabase(appliance, brand, problem, email, fallbackResult)
    return fallbackResult
  }
}

// Enhanced fallback specifically for error codes
function getErrorCodeFallback(errorCode: string, appliance: string, brand: string, problem: string): DiagnosisResult {
  return {
    possibleCauses: [
      `${brand} ${appliance} error code ${errorCode} indicates a specific system fault`,
      "Component malfunction requiring professional diagnostic equipment",
      "Electronic control system communication error",
      "Sensor or component failure specific to this error code"
    ],
    recommendations: {
      diy: [
        "Power cycle the appliance (unplug for 2 minutes, then restart)",
        "Check all connections are secure and properly seated",
        "Verify appliance settings are correct for current operation",
        "Consult user manual for error code specific troubleshooting"
      ],
      professional: [
        `Professional diagnosis of ${brand} ${appliance} error code ${errorCode}`,
        "Specialized diagnostic equipment to identify exact component failure",
        "Brand-specific repair procedures using genuine parts",
        "Complete system testing and calibration after repair"
      ]
    },
    urgency: "medium",
    estimatedCost: "£109 - £149",
    difficulty: "expert",
    recommendedService: "professional",
    serviceReason: `Error code ${errorCode} on ${brand} ${appliance} requires professional diagnosis with specialized equipment to identify the exact component failure and ensure safe, accurate repair.`,
    skillsRequired: ["Specialized diagnostic tools", "Brand-specific technical knowledge", "Electronic component testing"],
    timeEstimate: "1 - 2 hours",
    safetyWarnings: [
      "Always disconnect power before attempting any inspection",
      "Error codes often indicate electrical or safety-critical component faults",
      "Professional diagnosis strongly recommended for accurate identification and safe repair"
    ]
  }
}

// Database save function
async function saveDiagnosticToDatabase(
  appliance: string,
  brand: string, 
  problem: string, 
  email: string, 
  diagnosis: DiagnosisResult
): Promise<void> {
  try {
    const { error } = await supabase
      .from('diagnostics')
      .insert({
        email,
        appliance_type: appliance,
        appliance_brand: brand || null,
        problem_description: problem,
        estimated_time: diagnosis.timeEstimate,
        estimated_cost: diagnosis.estimatedCost,
        difficulty_level: diagnosis.difficulty,
        priority_level: diagnosis.urgency,
        possible_causes: diagnosis.possibleCauses,
        diy_solutions: diagnosis.recommendations.diy,
        professional_services: diagnosis.recommendations.professional,
        recommended_action: diagnosis.recommendedService,
        converted_to_booking: false,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Database save error:', error)
    } else {
      console.log('Diagnostic saved to database successfully')
    }
  } catch (error) {
    console.error('Failed to save diagnostic to database:', error)
  }
}

// Standard fallback for non-error-code problems
function getFallbackDiagnosis(appliance: string, brand: string, problem: string): DiagnosisResult {
  const problemLower = problem.toLowerCase()
  
  const isElectrical = appliance.toLowerCase().includes('oven') || 
                      appliance.toLowerCase().includes('cooker') ||
                      appliance.toLowerCase().includes('microwave') ||
                      problemLower.includes('electrical')
  
  const isWaterRelated = appliance.toLowerCase().includes('washing') ||
                        appliance.toLowerCase().includes('dishwasher') ||
                        appliance.toLowerCase().includes('dryer')

  const isSafetyIssue = problemLower.includes('smoke') || 
                       problemLower.includes('sparking') || 
                       problemLower.includes('burning')

  const brandText = brand ? ` ${brand}` : ""
  const urgency = isSafetyIssue ? "high" : "medium"
  const recommendedService = isSafetyIssue || isElectrical ? "professional" : "professional"

  return {
    possibleCauses: [
      `${brandText} ${appliance} component wear or malfunction`,
      isElectrical ? "Electrical system or component issue" : 
      isWaterRelated ? "Water system blockage or pump malfunction" : "Mechanical component failure",
      "Internal sensor or control system issue",
      "Regular maintenance required or component replacement needed"
    ],
    recommendations: {
      diy: [
        "Power cycle the appliance (unplug for 2 minutes, then restart)",
        isWaterRelated ? "Check and clean filters, inspect for blockages" : "Inspect for visible debris or loose connections",
        "Verify all settings are correct for intended operation",
        "Consult user manual for basic troubleshooting steps"
      ],
      professional: [
        `Professional diagnostic inspection of${brandText} ${appliance}`,
        "Specialized equipment testing and component analysis", 
        "Genuine parts replacement with warranty coverage",
        "Complete safety inspection and performance optimization"
      ]
    },
    urgency,
    estimatedCost: isElectrical ? "£109 - £149" : "£50 - £149",
    difficulty: isElectrical || isSafetyIssue ? "expert" : "difficult",
    recommendedService,
    serviceReason: isSafetyIssue 
      ? "Safety issues require immediate professional assessment to prevent potential hazards."
      : "Professional service ensures accurate diagnosis, quality repair, and safety compliance.",
    skillsRequired: ["Specialized diagnostic equipment", "Brand-specific technical knowledge"],
    timeEstimate: "1 - 2 hours",
    safetyWarnings: isSafetyIssue ? [
      "SAFETY CRITICAL: Disconnect power immediately",
      "Do not operate appliance until professionally inspected", 
      "Potential fire or electrical hazard - professional service required"
    ] : [
      "Always disconnect power before any inspection or repair attempts",
      "Professional service recommended for warranty protection and safety"
    ]
  }
}

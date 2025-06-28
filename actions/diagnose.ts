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

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
  error?: {
    message: string
    code?: string
  }
}

// Enhanced error code detection with better patterns
function detectErrorCode(problem: string): string | null {
  const problemLower = problem.toLowerCase()
  
  const errorCodePatterns = [
    /\berror\s+code\s*[:\-]?\s*([a-z]?\d{1,3}[a-z]?)\b/gi,
    /\bcode\s*[:\-]?\s*([a-z]?\d{1,3}[a-z]?)\b/gi,
    /\b[ef][-]?(\d{1,3}[a-z]?)\b/gi,
    /\b(\d{1,2}[ef])\b/gi,  // Samsung: 4E, 5E
    /\b([a-z]{1,2}\d{1,2})\b/gi,  // LG: OE, IE
    /\b(f\d{2})\b/gi,  // Bosch/Siemens: F21, F34
    /\b(h\d{2})\b/gi,  // Some brands use H codes
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

// Websearch-enabled error code lookup
async function lookupErrorCodeWithWebsearch(
  errorCode: string, 
  brand: string, 
  appliance: string, 
  apiKey: string
): Promise<DiagnosisResult | null> {
  try {
    console.log(`Looking up error code ${errorCode} for ${brand} ${appliance} with websearch`)
    
    const prompt = `What does error code ${errorCode} mean on a ${brand} ${appliance}? 
    
Please provide:
1. What this specific error code indicates
2. The 3 most likely causes
3. Whether this is typically a DIY fix or requires professional service
4. Estimated cost range for repair
5. Any safety concerns
6. Difficulty level (easy/moderate/difficult/expert)

Focus on accurate, specific information for this exact error code and brand combination.`

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "RS Repairs Error Code Lookup"
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet:online', // Enable websearch
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
        temperature: 0.1
      })
    })

    if (!response.ok) {
      console.error(`OpenRouter API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data: OpenRouterResponse = await response.json()
    
    if (data.error) {
      console.error(`OpenRouter returned error:`, data.error)
      return null
    }

    const aiResponse = data.choices[0]?.message?.content?.trim()
    if (!aiResponse) {
      console.error('No response content from AI')
      return null
    }

    console.log(`AI websearch response for ${errorCode}:`, aiResponse)
    
    // Parse the detailed response into structured format
    return parseDetailedAIResponse(aiResponse, errorCode, brand, appliance)

  } catch (error) {
    console.error(`Error in websearch lookup:`, error)
    return null
  }
}

// Parse detailed AI response into DiagnosisResult format
function parseDetailedAIResponse(
  response: string, 
  errorCode: string, 
  brand: string, 
  appliance: string
): DiagnosisResult {
  const lines = response.toLowerCase()
  
  // Extract service recommendation with better logic
  const isDIY = lines.includes('diy') || lines.includes('user can') || lines.includes('easy fix') || lines.includes('simple')
  const isProfessional = lines.includes('professional') || lines.includes('technician') || lines.includes('specialist') || lines.includes('complex')
  const isElectrical = lines.includes('electrical') || lines.includes('control board') || lines.includes('wiring')
  
  // Determine recommended service
  let recommendedService: "diy" | "professional" | "warranty" = "professional"
  let difficulty: "easy" | "moderate" | "difficult" | "expert" = "expert"
  
  if (isDIY && !isElectrical && !isProfessional) {
    recommendedService = "diy"
    difficulty = "moderate"
  } else if (isElectrical || lines.includes('safety') || lines.includes('dangerous')) {
    recommendedService = "professional"
    difficulty = "expert"
  }
  
  // Extract urgency
  let urgency: "low" | "medium" | "high" = "medium"
  if (lines.includes('urgent') || lines.includes('immediately') || lines.includes('safety')) {
    urgency = "high"
  } else if (lines.includes('not urgent') || lines.includes('convenience')) {
    urgency = "low"
  }
  
  // Extract cost estimate
  let estimatedCost = "£109 - £149"
  const costMatch = response.match(/£(\d+).*?£(\d+)/i)
  if (costMatch) {
    estimatedCost = `£${costMatch[1]} - £${costMatch[2]}`
  } else if (recommendedService === "diy") {
    estimatedCost = "£0 - £50"
  }
  
  // Generate structured recommendations
  const diyRecommendations = recommendedService === "diy" ? [
    "Power cycle the appliance (unplug for 2 minutes)",
    "Check for obvious blockages or loose connections",
    "Consult your user manual for specific troubleshooting steps",
    "Verify appliance settings are correct for the error code"
  ] : [
    "Power cycle the appliance as an initial test",
    "Note any additional symptoms or error patterns",
    "Check user manual for basic troubleshooting only",
    "Professional service recommended for this error code"
  ]
  
  const professionalRecommendations = [
    `Professional diagnosis of ${brand} ${appliance} error code ${errorCode}`,
    "Specialized diagnostic equipment to identify exact component failure",
    "Brand-specific repair procedures using genuine parts",
    "Complete system testing and warranty-backed repair"
  ]
  
  // Extract possible causes from AI response
  const possibleCauses = [
    `${brand} ${appliance} error code ${errorCode} detected`,
    "Component malfunction or sensor failure",
    "System communication or control board issue"
  ]
  
  // Try to extract more specific causes from the AI response
  const causeKeywords = ['blocked', 'faulty', 'damaged', 'worn', 'loose', 'clogged', 'failed']
  const foundCauses = causeKeywords.filter(keyword => lines.includes(keyword))
  if (foundCauses.length > 0) {
    possibleCauses.push(`Potential ${foundCauses.join(' or ')} components`)
  }
  
  const serviceReason = recommendedService === "diy" 
    ? `Error code ${errorCode} on ${brand} ${appliance} can typically be resolved with basic troubleshooting steps.`
    : `Error code ${errorCode} on ${brand} ${appliance} requires professional diagnosis with specialized equipment for accurate identification and safe repair.`
  
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
      : ["Specialized diagnostic tools", "Brand-specific technical knowledge", "Electronic testing equipment"],
    timeEstimate: recommendedService === "diy" ? "30 - 60 minutes" : "1 - 2 hours",
    safetyWarnings: isElectrical || lines.includes('safety') ? [
      "Always disconnect power before attempting any inspection",
      "This error may indicate electrical component issues",
      "Professional service strongly recommended for safety"
    ] : [
      "Always disconnect power before attempting any inspection", 
      "If unsure about any step, contact professional service",
      "Follow all manufacturer safety guidelines"
    ]
  }
}

// Fallback for general problems without error codes
async function diagnoseGeneralProblem(
  appliance: string,
  brand: string, 
  problem: string,
  apiKey: string
): Promise<DiagnosisResult | null> {
  try {
    const prompt = `I have a ${brand} ${appliance} with this problem: "${problem}"

Please provide a professional appliance repair diagnosis including:
1. 3-4 most likely causes for this specific problem
2. Whether this requires DIY or professional service
3. Estimated repair cost range
4. Safety considerations
5. Difficulty level and time estimate

Be specific to ${brand} appliances and this exact problem description.`

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST", 
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "RS Repairs General Diagnosis"
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet', // No websearch for general problems
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.1
      })
    })

    if (!response.ok) {
      console.error(`OpenRouter API error: ${response.status}`)
      return null
    }

    const data: OpenRouterResponse = await response.json()
    const aiResponse = data.choices[0]?.message?.content?.trim()
    
    if (!aiResponse) {
      return null
    }

    return parseDetailedAIResponse(aiResponse, 'N/A', brand, appliance)

  } catch (error) {
    console.error('Error in general diagnosis:', error)
    return null
  }
}

// Main diagnosis function with improved flow
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
        await saveDiagnosticToDatabase(appliance, brand, problem, email, websearchResult)
        return websearchResult
      }
      
      console.log('Websearch failed, trying fallback for error code')
    }
    
    // Step 2: For general problems (no error code), use standard AI
    if (!detectedErrorCode && brand) {
      const generalResult = await diagnoseGeneralProblem(
        appliance,
        brand,
        problem, 
        openRouterApiKey
      )
      
      if (generalResult) {
        await saveDiagnosticToDatabase(appliance, brand, problem, email, generalResult)
        return generalResult
      }
    }

    // Step 3: Fallback diagnosis
    console.log('Using fallback diagnosis')
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

// Enhanced database save with better error handling
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
      throw error
    }

    console.log('Diagnostic saved to database successfully')
  } catch (error) {
    console.error('Failed to save diagnostic to database:', error)
    // Don't throw - allow the diagnosis to continue even if DB save fails
  }
}

// Improved fallback with better logic
function getFallbackDiagnosis(appliance: string, brand: string, problem: string): DiagnosisResult {
  const detectedErrorCode = detectErrorCode(problem)
  const problemLower = problem.toLowerCase()
  
  const isElectrical = appliance.toLowerCase().includes('oven') || 
                      appliance.toLowerCase().includes('cooker') ||
                      appliance.toLowerCase().includes('microwave') ||
                      problemLower.includes('electrical') ||
                      problemLower.includes('sparking')
  
  const isWaterRelated = appliance.toLowerCase().includes('washing') ||
                        appliance.toLowerCase().includes('dishwasher') ||
                        appliance.toLowerCase().includes('dryer')

  const isSafetyIssue = problemLower.includes('smoke') || 
                       problemLower.includes('sparking') || 
                       problemLower.includes('burning') ||
                       problemLower.includes('electrical')

  const brandText = brand ? ` ${brand}` : ""
  const urgency = isSafetyIssue ? "high" : "medium"
  const recommendedService = isSafetyIssue || isElectrical || detectedErrorCode ? "professional" : "professional"

  return {
    possibleCauses: detectedErrorCode ? [
      `${brandText} ${appliance} error code ${detectedErrorCode} indicates a system fault`,
      "Electronic component or sensor malfunction", 
      "Control system communication error",
      "Component requiring professional diagnostic equipment"
    ] : [
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
        `Professional diagnostic inspection of ${brandText} ${appliance}`,
        "Specialized equipment testing and component analysis", 
        "Genuine parts replacement with warranty coverage",
        "Complete safety inspection and performance optimization"
      ]
    },
    urgency,
    estimatedCost: isElectrical || detectedErrorCode ? "£109 - £149" : "£50 - £149",
    difficulty: isElectrical || isSafetyIssue || detectedErrorCode ? "expert" : "difficult",
    recommendedService,
    serviceReason: detectedErrorCode 
      ? `Error code ${detectedErrorCode} requires professional diagnosis with specialized equipment for accurate repair.`
      : isSafetyIssue 
      ? "Safety issues require immediate professional assessment to prevent potential hazards."
      : "Professional service ensures accurate diagnosis, quality repair, and safety compliance.",
    skillsRequired: recommendedService === "professional" ? [
      "Specialized diagnostic equipment",
      "Brand-specific technical knowledge", 
      "Safety protocols and procedures"
    ] : ["Basic tools", "Technical aptitude", "Safety awareness"],
    timeEstimate: recommendedService === "professional" ? "1 - 2 hours" : "30 - 90 minutes",
    safetyWarnings: isSafetyIssue ? [
      "SAFETY CRITICAL: Disconnect power immediately",
      "Do not operate appliance until professionally inspected", 
      "Potential fire or electrical hazard - professional service required"
    ] : [
      "Always disconnect power before any inspection or repair attempts",
      "Professional service recommended for warranty protection and safety",
      isWaterRelated ? "Check for water leaks before operating" : "Ensure all connections are secure"
    ]
  }
}

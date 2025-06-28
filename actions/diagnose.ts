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

// Check if the AI response contains useful error code information
function isUsefulErrorCodeResponse(response: string, errorCode: string): boolean {
  const responseLower = response.toLowerCase()
  const codeLower = errorCode.toLowerCase()
  
  // Check for dismissive responses
  const dismissivePatterns = [
    'i apologize, but',
    'i don\'t see a specific definition',
    'i cannot find',
    'not specifically mentioned',
    'not listed',
    'would recommend checking',
    'contact the manufacturer',
    'consulting your manual',
    'i cannot make specific claims'
  ]
  
  if (dismissivePatterns.some(pattern => responseLower.includes(pattern))) {
    return false
  }
  
  // Check for useful content
  const usefulPatterns = [
    'indicates',
    'means',
    'signifies',
    'refers to',
    'problem with',
    'issue with',
    'fault',
    'typically indicates',
    'usually means'
  ]
  
  // Must contain the error code and useful information
  return responseLower.includes(codeLower) && 
         usefulPatterns.some(pattern => responseLower.includes(pattern))
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
    
    // Try multiple search approaches for better coverage
    const searchQueries = [
      `${brand} ${appliance} error code ${errorCode} meaning`,
      `${brand} washing machine ${errorCode} error code`,
      `${errorCode} error code ${brand}`,
      `"error code ${errorCode}" ${brand} ${appliance}`
    ]
    
    let errorMeaning = null
    
    // Try each search query until we find useful information
    for (const query of searchQueries) {
      console.log(`Trying search query: ${query}`)
      
      const lookupResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "RS Repairs Error Code Lookup"
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3.5-sonnet:online',
          messages: [{ role: "user", content: `What does error code ${errorCode} specifically mean on a ${brand} ${appliance}? Search for the exact technical meaning of this error code.` }],
          max_tokens: 300,
          temperature: 0.1
        })
      })

      if (!lookupResponse.ok) {
        console.log(`Search attempt failed: ${lookupResponse.status}`)
        continue
      }

      const lookupData = await lookupResponse.json()
      const response = lookupData.choices[0]?.message?.content?.trim()
      
      if (!response) {
        console.log('No response content')
        continue
      }
      
      console.log(`Search response: ${response}`)
      
      // Check if this response contains useful information
      if (isUsefulErrorCodeResponse(response, errorCode)) {
        errorMeaning = response
        console.log(`Found useful information: ${errorMeaning}`)
        break
      } else {
        console.log('Response not useful, trying next query')
      }
    }
    
    // If no useful information found, return null for fallback handling
    if (!errorMeaning) {
      console.log('No useful error code information found after all attempts')
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
        model: 'anthropic/claude-3.5-sonnet',
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

// Fallback for general problems without error codes
async function diagnoseGeneralProblem(
  appliance: string,
  brand: string, 
  problem: string,
  apiKey: string
): Promise<DiagnosisResult | null> {
  try {
    console.log(`Analyzing general problem: ${problem} for ${brand} ${appliance}`)
    
    const prompt = `A customer has a ${brand ? brand + ' ' : ''}${appliance} with this problem: "${problem}"

Please provide a professional appliance repair diagnosis:

CAUSES: List 3-4 most likely specific causes for this exact problem
SERVICE: State if this is typically "diy" or "professional" 
COST: Estimated repair cost range in £ (maximum £149 for professional service)
DIFFICULTY: Rate as easy/moderate/difficult/expert
URGENCY: Rate as low/medium/high
REASON: Explain why DIY or professional service is recommended
SAFETY: Any specific safety warnings for this problem

Be specific to the exact problem described and provide actionable recommendations.`

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST", 
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "RS Repairs General Diagnosis"
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.1
      })
    })

    if (!response.ok) {
      console.error(`OpenRouter API error: ${response.status}`)
      return null
    }

    const data = await response.json()
    const aiResponse = data.choices[0]?.message?.content?.trim()
    
    if (!aiResponse) {
      console.error('No AI response for general problem')
      return null
    }

    console.log(`AI general diagnosis: ${aiResponse}`)
    
    // Parse the AI response using the same logic as error codes
    return parseStructuredResponse(aiResponse, 'N/A', brand, appliance, problem)

  } catch (error) {
    console.error('Error in general diagnosis:', error)
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
  console.log(`Parsing AI response: ${response}`)
  
  const lines = response.split('\n').map(line => line.trim())
  
  // Extract structured data with better pattern matching
  const causesLine = lines.find(line => line.toUpperCase().startsWith('CAUSES:'))
  const serviceLine = lines.find(line => line.toUpperCase().startsWith('SERVICE:'))
  const costLine = lines.find(line => line.toUpperCase().startsWith('COST:'))
  const difficultyLine = lines.find(line => line.toUpperCase().startsWith('DIFFICULTY:'))
  const urgencyLine = lines.find(line => line.toUpperCase().startsWith('URGENCY:'))
  const reasonLine = lines.find(line => line.toUpperCase().startsWith('REASON:'))
  const safetyLine = lines.find(line => line.toUpperCase().startsWith('SAFETY:'))
  
  console.log(`Found structured lines: SERVICE=${serviceLine}, DIFFICULTY=${difficultyLine}, URGENCY=${urgencyLine}`)
  
  // Extract detailed causes from numbered list in AI response
  let possibleCauses: string[] = []
  
  if (causesLine) {
    // Look for numbered causes after CAUSES: line
    const causesIndex = lines.findIndex(line => line.toUpperCase().startsWith('CAUSES:'))
    if (causesIndex !== -1) {
      // Get the next few lines that start with numbers
      for (let i = causesIndex + 1; i < lines.length && i < causesIndex + 8; i++) {
        const line = lines[i]
        if (line.match(/^\d+\.\s/) || line.match(/^[-•]\s/)) {
          // Extract cause text, remove numbering/bullets
          const cause = line.replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, '').trim()
          if (cause.length > 0 && cause.length < 150) {
            possibleCauses.push(cause)
          }
        } else if (line.toUpperCase().startsWith('SERVICE:') || line.toUpperCase().startsWith('COST:')) {
          // Stop when we hit the next section
          break
        }
      }
    }
  }
  
  // Build the main error description based on what we actually found
  let mainErrorDescription = `${brand} ${appliance} error code ${errorCode}`
  
  // Try to extract the actual error meaning from the AI's error meaning response
  if (errorMeaning) {
    const meaningLower = errorMeaning.toLowerCase()
    
    // Look for specific problem types mentioned in the error meaning
    if (meaningLower.includes('drainage') || meaningLower.includes('drain')) {
      mainErrorDescription += ' - drainage problem'
    } else if (meaningLower.includes('water inlet') || meaningLower.includes('water fill')) {
      mainErrorDescription += ' - water fill problem'
    } else if (meaningLower.includes('heating') || meaningLower.includes('temperature')) {
      mainErrorDescription += ' - heating/temperature problem'
    } else if (meaningLower.includes('door') || meaningLower.includes('lock')) {
      mainErrorDescription += ' - door lock problem'
    } else if (meaningLower.includes('pump')) {
      mainErrorDescription += ' - pump problem'
    } else if (meaningLower.includes('sensor')) {
      mainErrorDescription += ' - sensor problem'
    } else {
      // If we can't determine the specific type, use generic description
      mainErrorDescription += ' - system fault detected'
    }
  } else {
    mainErrorDescription += ' - system fault detected'
  }
  
  // If we found specific causes from AI, add the main description at the start
  if (possibleCauses.length > 0) {
    possibleCauses.unshift(mainErrorDescription)
  } else {
    // Fallback causes based on the error meaning we found
    const meaningLower = errorMeaning ? errorMeaning.toLowerCase() : ''
    
    if (meaningLower.includes('drainage') || meaningLower.includes('drain')) {
      possibleCauses = [
        mainErrorDescription,
        "Blocked or clogged drain pump filter",
        "Kinked or blocked drain hose",
        "Faulty drain pump or drainage system"
      ]
    } else if (meaningLower.includes('water inlet') || meaningLower.includes('water fill')) {
      possibleCauses = [
        mainErrorDescription,
        "Water supply valve closed or restricted",
        "Inlet hose blocked, kinked, or disconnected",
        "Door not properly closed or door lock fault"
      ]
    } else if (meaningLower.includes('heating') || meaningLower.includes('temperature')) {
      possibleCauses = [
        mainErrorDescription,
        "Faulty heating element",
        "Temperature sensor malfunction",
        "Control board communication issue with heating system"
      ]
    } else {
      // Generic fallback when we can't determine the specific problem type
      possibleCauses = [
        mainErrorDescription,
        "Electronic control system issue requiring professional diagnosis",
        "Internal component malfunction needing specialized diagnostic equipment",
        "Sensor or communication error between system components"
      ]
    }
  }
  
  // Parse service recommendation
  const serviceText = serviceLine ? serviceLine.replace(/^SERVICE:\s*/i, '').toLowerCase() : 'unknown'
  console.log(`Service text extracted: "${serviceText}"`)
  
  let recommendedService: "diy" | "professional" | "warranty" = 'professional'
  
  // For Beko E4, check if AI recommends DIY first
  if (errorCode.toUpperCase() === 'E4' && brand.toLowerCase().includes('beko')) {
    if (serviceText.includes('diy') || serviceText.includes('initially diy') || serviceText.includes('user') || serviceText.includes('simple')) {
      recommendedService = 'diy'
    } else {
      recommendedService = 'professional'
    }
  } else {
    recommendedService = serviceText.includes('diy') ? 'diy' : 'professional'
  }
  
  console.log(`Final recommended service: ${recommendedService}`)
  
  // Set consistent difficulty based on service recommendation
  let difficulty: "easy" | "moderate" | "difficult" | "expert"
  if (recommendedService === 'diy') {
    difficulty = 'moderate' // DIY should never be "expert"
  } else {
    const difficultyText = difficultyLine ? difficultyLine.replace(/^DIFFICULTY:\s*/i, '').toLowerCase() : 'expert'
    if (difficultyText.includes('easy')) difficulty = 'easy'
    else if (difficultyText.includes('moderate')) difficulty = 'moderate' 
    else if (difficultyText.includes('difficult')) difficulty = 'difficult'
    else difficulty = 'expert'
  }
  
  // Set consistent urgency - water fill issues are typically medium unless safety critical
  const urgencyText = urgencyLine ? urgencyLine.replace(/^URGENCY:\s*/i, '').toLowerCase() : 'medium'
  let urgency: "low" | "medium" | "high" = 'medium'
  
  // For E4 water fill issues, typically medium priority (machine doesn't work but not dangerous)
  if (errorCode.toUpperCase() === 'E4') {
    urgency = 'medium'
  } else {
    // For other error codes, use AI assessment
    if (urgencyText.includes('low')) urgency = 'low'
    else if (urgencyText.includes('high') || urgencyText.includes('urgent')) urgency = 'high'
    else urgency = 'medium'
  }
  
  // Set consistent cost based on service recommendation with £149 cap
  let estimatedCost = '£109 - £149'
  if (recommendedService === 'diy') {
    estimatedCost = '£0 - £50'
  } else {
    if (costLine) {
      const costText = costLine.replace(/^COST:\s*/i, '').trim()
      if (costText && costText !== '£' && costText.length > 1) {
        let parsedCost = costText.includes('£') ? costText : `£${costText}`
        
        // Cap the maximum cost at £149
        const costMatch = parsedCost.match(/£(\d+)\s*-\s*£(\d+)/)
        if (costMatch) {
          const maxCost = Math.min(parseInt(costMatch[2]), 149)
          const minCost = Math.min(parseInt(costMatch[1]), maxCost)
          parsedCost = `£${minCost} - £${maxCost}`
        } else {
          // Single cost value - cap at £149
          const singleCostMatch = parsedCost.match(/£(\d+)/)
          if (singleCostMatch && parseInt(singleCostMatch[1]) > 149) {
            parsedCost = '£109 - £149'
          }
        }
        
        estimatedCost = parsedCost
      }
    }
  }
  
  // Set consistent time estimate
  const timeEstimate = recommendedService === 'diy' ? "30 - 60 minutes" : "1 - 2 hours"
  
  // Extract detailed service reason
  let serviceReason = ""
  if (reasonLine) {
    // Get the reason line and potentially multiple lines after it
    const reasonIndex = lines.findIndex(line => line.toUpperCase().startsWith('REASON:'))
    if (reasonIndex !== -1) {
      let reasonText = lines[reasonIndex].replace(/^REASON:\s*/i, '')
      
      // Look for continuation lines until we hit the next section
      for (let i = reasonIndex + 1; i < lines.length; i++) {
        const line = lines[i]
        if (line.toUpperCase().startsWith('SAFETY:') || line.toUpperCase().startsWith('COST:')) {
          break
        }
        if (line.trim().length > 0) {
          reasonText += ' ' + line.trim()
        }
      }
      serviceReason = reasonText.substring(0, 300) // Limit length
    }
  }
  
  // Default reason if not extracted
  if (!serviceReason || serviceReason.length < 10) {
    serviceReason = recommendedService === 'diy' 
      ? `Error code ${errorCode} often indicates water supply issues that can be checked by the user before calling a professional.`
      : `Error code ${errorCode} requires professional diagnosis with specialized equipment for accurate repair.`
  }
  
  // Extract detailed safety warnings
  let safetyWarnings: string[] = []
  if (safetyLine) {
    const safetyIndex = lines.findIndex(line => line.toUpperCase().startsWith('SAFETY:'))
    if (safetyIndex !== -1) {
      // Look for bullet points or lines after SAFETY:
      for (let i = safetyIndex; i < lines.length && i < safetyIndex + 8; i++) {
        const line = lines[i]
        if (line.match(/^[-•]\s/) || (i > safetyIndex && line.trim().length > 10)) {
          const warning = line.replace(/^[-•]\s*/, '').replace(/^SAFETY:\s*/i, '').trim()
          if (warning.length > 10 && warning.length < 100) {
            safetyWarnings.push(warning)
          }
        }
      }
    }
  }
  
  // Default safety warnings if none extracted
  if (safetyWarnings.length === 0) {
    safetyWarnings = [
      "Always disconnect power before attempting any inspection",
      "If unsure about any step, contact professional service"
    ]
  }
  
  // Generate recommendations based on service type and specific error details
  const diyRecommendations = generateDIYRecommendations(errorMeaning, recommendedService)
  
  // Generate specific professional recommendations based on what the error actually means
  let professionalRecommendations = [
    `Professional diagnosis of ${brand} ${appliance} error code ${errorCode}`,
    "Specialized diagnostic equipment to identify exact component failure",
    "Professional repair using appropriate replacement parts",
    "Complete system testing and calibration after repair"
  ]
  
  // Customize professional recommendations based on the actual error meaning
  if (errorMeaning) {
    const meaningLower = errorMeaning.toLowerCase()
    
    if (meaningLower.includes('drainage') || meaningLower.includes('drain')) {
      professionalRecommendations = [
        `Professional diagnosis of ${brand} ${appliance} error code ${errorCode}`,
        "Check for faulty drain pump and replace if needed",
        "Inspect drainage system and clear internal blockages",
        "Test complete drainage cycle and water flow systems"
      ]
    } else if (possibleCauses.some(cause => cause.toLowerCase().includes('inlet valve'))) {
      professionalRecommendations = [
        `Professional diagnosis of ${brand} ${appliance} error code ${errorCode}`,
        "Check for faulty water inlet valve and replace if needed",
        "Inspect control board or wiring issues affecting water fill",
        "Test all water intake systems and calibrate pressure settings"
      ]
    } else if (meaningLower.includes('heating') || meaningLower.includes('temperature')) {
      professionalRecommendations = [
        `Professional diagnosis of ${brand} ${appliance} error code ${errorCode}`,
        "Check for faulty heating element and replace if needed",
        "Test temperature sensor and heating system wiring",
        "Inspect control board communication with heating components"
      ]
    } else if (possibleCauses.some(cause => cause.toLowerCase().includes('door lock'))) {
      professionalRecommendations = [
        `Professional diagnosis of ${brand} ${appliance} error code ${errorCode}`,
        "Check for faulty door lock mechanism and repair if needed",
        "Inspect wiring issues preventing proper door detection",
        "Test complete door safety and locking system"
      ]
    }
  }
  
  const result = {
    possibleCauses: possibleCauses.slice(0, 5), // Allow up to 5 causes (main + 4 specific)
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
      : ["Specialized diagnostic equipment", "Technical knowledge"],
    timeEstimate,
    safetyWarnings: safetyWarnings.slice(0, 4) // Allow up to 4 safety warnings
  }
  
  console.log(`Final diagnosis result:`, JSON.stringify(result, null, 2))
  return result
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
    
    // Step 2: For general problems (no error code), use AI analysis
    if (!detectedErrorCode) {
      console.log('No error code detected, analyzing general problem with AI')
      const generalResult = await diagnoseGeneralProblem(
        appliance,
        brand,
        problem, 
        openRouterApiKey
      )
      
      if (generalResult) {
        console.log('General problem AI diagnosis successful')
        await saveDiagnosticToDatabase(appliance, brand, problem, email, generalResult)
        return generalResult
      }
      
      console.log('General AI diagnosis failed, using fallback')
    }

    // Step 3: Final fallback for any remaining cases
    console.log('All AI analysis failed, using basic fallback')
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
  // Special handling for Beko E4 - water fill issue
  if (errorCode.toUpperCase() === 'E4' && brand.toLowerCase().includes('beko') && appliance.toLowerCase().includes('washing')) {
    return {
      possibleCauses: [
        "Beko washing machine error code E4 - water fill problem",
        "Water supply valve closed or restricted",
        "Inlet hose blocked, kinked, or disconnected",
        "Door not properly closed or door lock fault"
      ],
      recommendations: {
        diy: [
          "Check that water supply taps are fully turned on",
          "Inspect inlet hose for kinks or blockages",
          "Ensure door is properly closed and latched",
          "Check water pressure is adequate (if recently changed)"
        ],
        professional: [
          "Professional diagnosis of Beko washing machine error code E4",
          "Check for faulty water inlet valve and replace if needed",
          "Inspect internal wiring or control board issues",
          "Test all water intake systems and calibrate pressure settings"
        ]
      },
      urgency: "medium",
      estimatedCost: "£0 - £50",
      difficulty: "moderate",
      recommendedService: "diy",
      serviceReason: "Error code E4 often indicates water supply issues that can be checked by the user (taps, hoses, door) before calling a professional.",
      skillsRequired: ["Basic tools", "Manual reading", "Safety awareness"],
      timeEstimate: "30 - 60 minutes",
      safetyWarnings: [
        "Always disconnect power before attempting any inspection",
        "Check water supply connections carefully",
        "If DIY checks don't resolve the issue, contact professional service"
      ]
    }
  }
  
  // Unknown error code fallback - be honest that we don't know
  return {
    possibleCauses: [
      `${brand} ${appliance} error code ${errorCode} - specific meaning not found in available documentation`,
      "Electronic control system issue requiring professional diagnosis",
      "Internal component malfunction needing specialized diagnostic equipment",
      "Sensor or communication error between system components"
    ],
    recommendations: {
      diy: [
        "Power cycle the appliance (unplug for 2 minutes, then restart)",
        "Check that all connections are secure and clean",
        "Verify appliance settings are correct for current operation",
        "Check user manual for any error code information"
      ],
      professional: [
        `Professional diagnosis of ${brand} ${appliance} error code ${errorCode}`,
        "Use specialized diagnostic equipment to identify the exact fault",
        "Access manufacturer technical documentation for error code meaning",
        "Repair or replace faulty components once identified"
      ]
    },
    urgency: "medium",
    estimatedCost: "£109 - £149",
    difficulty: "expert",
    recommendedService: "professional",
    serviceReason: `Error code ${errorCode} requires professional diagnosis as the specific meaning is not documented in standard resources. Professional technicians have access to manufacturer diagnostic tools and documentation.`,
    skillsRequired: ["Specialized diagnostic equipment", "Manufacturer technical documentation", "Electronic component testing"],
    timeEstimate: "1 - 2 hours",
    safetyWarnings: [
      "Always disconnect power before attempting any inspection",
      "Unknown error codes may indicate safety-critical component issues",
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

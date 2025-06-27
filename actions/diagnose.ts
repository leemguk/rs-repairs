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

// Enhanced error code detection function
function detectErrorCode(problem: string): string | null {
  const problemLower = problem.toLowerCase()
  
  // More comprehensive error code patterns
  const errorCodePatterns = [
    /\berror\s+code\s*[:\-]?\s*([ef]?\d{1,3}[a-z]?)\b/gi,  // "error code: E17", "error code 17"
    /\bcode\s*[:\-]?\s*([ef]?\d{1,3}[a-z]?)\b/gi,  // "code: E17", "code 17"
    /\b[ef][-]?(\d{1,3}[a-z]?)\b/gi,  // E17, F05, E9A, etc.
    /\b(\d{1,2}[ef])\b/gi,  // Samsung style: 4E, 5E
    /\b([a-z]{1,2}\d{1,2})\b/gi,  // LG style: OE, IE
  ]
  
  for (const pattern of errorCodePatterns) {
    const matches = problemLower.match(pattern)
    if (matches) {
      return matches[0].replace(/^(error\s+code|code)\s*[:\-]?\s*/i, '').toUpperCase()
    }
  }
  
  return null
}

// Function to parse the simple AI response into DiagnosisResult format
function parseSimpleResponse(response: string, errorCode: string, brand: string, appliance: string): DiagnosisResult {
  const lines = response.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  // Extract causes
  const causesLine = lines.find(line => line.startsWith('CAUSES:'))
  const causes = causesLine 
    ? causesLine.replace('CAUSES:', '').split(',').map(cause => cause.trim().replace(/^\d+\.\s*/, ''))
    : [`${brand} ${appliance} error code ${errorCode} detected`, "Component malfunction", "System fault"]
  
  // Extract service recommendation
  const serviceLine = lines.find(line => line.startsWith('SERVICE:'))
  const serviceText = serviceLine ? serviceLine.replace('SERVICE:', '').trim().toLowerCase() : 'professional'
  const recommendedService = serviceText.includes('diy') ? 'diy' : 'professional'
  
  // Extract cost
  const costLine = lines.find(line => line.startsWith('COST:'))
  const cost = costLine ? costLine.replace('COST:', '').trim() : '£109 - £149'
  
  // Extract reason
  const reasonLine = lines.find(line => line.startsWith('REASON:'))
  const reason = reasonLine 
    ? reasonLine.replace('REASON:', '').trim() 
    : `Error code ${errorCode} requires ${recommendedService} service for proper diagnosis and repair.`
  
  // Generate DIY and professional recommendations based on the error code
  const diyRecommendations = [
    "Power cycle the appliance (unplug for 2 minutes, then restart)",
    "Check for any obvious blockages or obstructions",
    "Verify all connections are secure and properly seated",
    "Consult your user manual for specific error code troubleshooting"
  ]
  
  const professionalRecommendations = [
    `Professional diagnosis of ${brand} ${appliance} error code ${errorCode}`,
    "Specialized diagnostic equipment to identify exact component failure",
    "Brand-specific repair procedures using genuine parts",
    "Complete system testing and calibration after repair"
  ]
  
  // Determine difficulty and urgency based on service recommendation
  const difficulty = recommendedService === 'diy' ? 'moderate' : 'expert'
  const urgency = errorCode.toLowerCase().includes('e') ? 'medium' : 'medium'
  
  return {
    possibleCauses: causes,
    recommendations: {
      diy: diyRecommendations,
      professional: professionalRecommendations
    },
    urgency: urgency,
    estimatedCost: cost,
    difficulty: difficulty,
    recommendedService: recommendedService,
    serviceReason: reason,
    skillsRequired: recommendedService === 'diy' 
      ? ["Basic tools", "Manual reading"] 
      : ["Specialized diagnostic tools", "Brand-specific technical knowledge"],
    timeEstimate: recommendedService === 'diy' ? "30 - 60 minutes" : "1 - 2 hours",
    safetyWarnings: [
      "Always disconnect power before attempting any inspection",
      "If unsure about any step, contact a professional service",
      "Error codes may indicate electrical or safety-critical component issues"
    ]
  }
}

// Test function for simple error code lookup - no JSON constraint
async function testErrorCodeLookup(errorCode: string, brand: string, appliance: string, apiKey: string): Promise<string> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "RS Repairs Error Code Test"
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          { 
            role: "user", 
            content: `What does error code ${errorCode} mean for a ${brand} ${appliance}? Give me just the meaning in one clear sentence.` 
          }
        ],
        max_tokens: 100,
        temperature: 0.1
        // NO JSON response format constraint
      })
    })

    const data = await response.json()
    const meaning = data.choices[0].message.content.trim()
    
    console.log(`Raw AI response for ${errorCode}:`, meaning)
    return meaning

  } catch (error) {
    console.error(`Error in test lookup:`, error)
    return "Failed to lookup"
  }
}

// Updated main function with ultra-simple approach
export async function diagnoseProblem(appliance: string, brand: string, problem: string, email: string): Promise<DiagnosisResult> {
  try {
    const openRouterApiKey = process.env.OPENROUTER_API_KEY

    if (!openRouterApiKey) {
      console.error('OpenRouter API key not found, using fallback')
      const fallbackResult = getFallbackDiagnosis(appliance, brand, problem)
      await saveDiagnosticToDatabase(appliance, brand, problem, email, fallbackResult)
      return fallbackResult
    }

    // Step 1: Simple error code detection
    const detectedErrorCode = detectErrorCode(problem)
    
    // Step 2: If we have error code + brand, do simple lookup
    if (detectedErrorCode && brand) {
      console.log(`Testing simple lookup for ${detectedErrorCode} ${brand} ${appliance}`)
      
      // Test the simple lookup first
      const errorMeaning = await testErrorCodeLookup(detectedErrorCode, brand, appliance, openRouterApiKey)
      console.log(`Got error meaning: ${errorMeaning}`)
      
      // Now use that meaning in a very simple prompt
      const simplePrompt = `I have a ${brand} ${appliance} showing error code ${detectedErrorCode}. 
      
This error code means: ${errorMeaning}

Based on this specific error code meaning, what are the 3 most likely causes and should this be DIY or professional repair?

Respond in this exact format:
CAUSES: cause1, cause2, cause3
SERVICE: diy OR professional
COST: £X - £Y
REASON: why this service is recommended`

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterApiKey}`,
          "Content-Type": "application/json",
          "X-Title": "RS Repairs Simple Diagnostic"
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3.5-sonnet',
          messages: [{ role: "user", content: simplePrompt }],
          max_tokens: 300,
          temperature: 0.1
          // NO JSON constraint
        })
      })

      const data = await response.json()
      const simpleResponse = data.choices[0].message.content.trim()
      
      console.log(`Simple diagnostic response:`, simpleResponse)
      
      // Parse the simple response and convert to DiagnosisResult
      const parsedResult = parseSimpleResponse(simpleResponse, detectedErrorCode, brand, appliance)
      
      // Save to database
      await saveDiagnosticToDatabase(appliance, brand, problem, email, parsedResult)
      
      return parsedResult
    }

    // Fallback for non-error-code cases
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

async function saveDiagnosticToDatabase(
  appliance: string,
  brand: string, 
  problem: string, 
  email: string, 
  diagnosis: DiagnosisResult
) {
  try {
    const { data, error } = await supabase
      .from('diagnostics')
      .insert([
        {
          email: email,
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
          converted_to_booking: false
        }
      ])

    if (error) {
      console.error('Database save error:', error)
    }

    return data
  } catch (error) {
    console.error('Failed to save diagnostic to database:', error)
  }
}

function getFallbackDiagnosis(appliance: string, brand: string, problem: string): DiagnosisResult {
  const detectedErrorCode = detectErrorCode(problem)
  
  const isElectrical = appliance.toLowerCase().includes('oven') || 
                      appliance.toLowerCase().includes('cooker') ||
                      appliance.toLowerCase().includes('microwave')
  
  const isWaterRelated = appliance.toLowerCase().includes('washing') ||
                        appliance.toLowerCase().includes('dishwasher') ||
                        appliance.toLowerCase().includes('dryer')

  const brandText = brand ? ` (${brand})` : ""

  // Enhanced fallback for detected error codes
  if (detectedErrorCode && brand) {
    return {
      possibleCauses: [
        `${brand} ${appliance.toLowerCase()} error code ${detectedErrorCode} indicates a specific system fault`,
        "Component malfunction requiring professional diagnostic equipment",
        "Control system communication error",
        "Sensor or electronic component failure"
      ],
      recommendations: {
        diy: [
          "Power cycle the appliance (unplug for 2 minutes, then restart)",
          "Check all connections are secure and properly seated",
          "Verify appliance settings are correct for the current cycle",
          "Consult your user manual for error code information"
        ],
        professional: [
          `Professional diagnosis of ${brand} ${appliance.toLowerCase()} error code ${detectedErrorCode}`,
          "Specialized diagnostic equipment to identify exact component failure",
          "Brand-specific repair procedures using genuine parts",
          "Complete system testing and calibration after repair"
        ],
      },
      urgency: "medium",
      estimatedCost: "£109 - £149",
      difficulty: "expert",
      recommendedService: "professional",
      serviceReason: `Error code ${detectedErrorCode} on ${brand} ${appliance.toLowerCase()} requires professional diagnosis with specialized equipment to identify the exact component failure and ensure safe, accurate repair.`,
      skillsRequired: ["Specialized diagnostic tools", "Brand-specific technical knowledge", "Electronic component testing"],
      timeEstimate: "1 - 2 hours",
      safetyWarnings: [
        "Always disconnect power before attempting any inspection",
        "Error codes often indicate electrical or safety-critical component faults",
        "Professional diagnosis recommended for accurate identification and safe repair"
      ]
    }
  }

  // Standard fallback for non-error code problems
  return {
    possibleCauses: [
      `${appliance}${brandText} component wear and tear`,
      isElectrical ? "Electrical connection issues" : isWaterRelated ? "Water system blockage or malfunction" : "Mechanical component failure",
      "Internal sensor or control board malfunction",
      "Regular maintenance required or overdue"
    ],
    recommendations: {
      diy: [
        "Check power connections and ensure appliance is plugged in properly",
        isWaterRelated ? "Clean filters and check for blockages in drain/inlet systems" : "Clean any visible debris or buildup",
        "Consult your user manual for basic troubleshooting steps",
        "Verify all appliance settings are correct for intended use"
      ],
      professional: [
        "Professional diagnostic inspection with specialized equipment",
        "Component replacement using genuine manufacturer parts",
        "Comprehensive safety check and performance testing",
        "Preventive maintenance recommendations to avoid future issues"
      ],
    },
    urgency: problem.toLowerCase().includes('sparking') || problem.toLowerCase().includes('smoke') ? "high" : "medium",
    estimatedCost: isElectrical ? "£109 - £149" : "£0 - £149",
    difficulty: isElectrical || problem.toLowerCase().includes('electrical') ? "expert" : "moderate",
    recommendedService: isElectrical || problem.toLowerCase().includes('electrical') || problem.toLowerCase().includes('sparking') ? "professional" : "professional",
    serviceReason: "This issue requires professional assessment to ensure safe and proper repair. Our certified technicians can provide accurate diagnosis and quality repairs with genuine parts.",
    skillsRequired: ["Technical diagnostic skills", "Safety knowledge"],
    timeEstimate: "45 - 90 minutes",
    safetyWarnings: isElectrical ? [
      "Always disconnect power before attempting any inspection",
      "Electrical repairs should only be performed by qualified technicians",
      "Never attempt repairs on live electrical components"
    ] : isWaterRelated ? [
      "Turn off water supply before any inspection or repair attempts",
      "Ensure appliance is completely drained before servicing",
      "Check for water leaks around all connections"
    ] : [
      "Always disconnect power before attempting any repairs",
      "Some appliance components may be under pressure or tension",
      "Professional service recommended for safety and warranty protection"
    ]
  }
}

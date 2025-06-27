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

// Removed error code database - AI will handle all error codes with proper prompting

// Enhanced error code detection function
function detectErrorCode(problem: string): string | null {
  const problemLower = problem.toLowerCase()
  
  // More comprehensive error code patterns
  const errorCodePatterns = [
    /\b[ef][-]?(\d{1,3}[a-z]?)\b/gi,  // E17, F05, E9A, etc.
    /\berror\s+code\s*[:\-]?\s*([ef]?\d{1,3}[a-z]?)\b/gi,  // "error code: 17", "error code E17"
    /\bcode\s*[:\-]?\s*([ef]?\d{1,3}[a-z]?)\b/gi,  // "code: E17", "code 17"
    /\b(\d{1,2}[ef])\b/gi,  // Samsung style: 4E, 5E
    /\b([a-z]{1,2}\d{1,2})\b/gi,  // LG style: OE, IE
  ]
  
  for (const pattern of errorCodePatterns) {
    const matches = problemLower.match(pattern)
    if (matches) {
      return matches[0].toUpperCase()
    }
  }
  
  return null
}

// Function to check for error codes in the problem description - now just for detection
function checkErrorCode(brand: string, problem: string): boolean {
  if (!brand) return false
  
  const problemLower = problem.toLowerCase()
  
  // Look for error codes in various formats (E9, e9, E-9, etc.)
  const errorCodeRegex = /\b[ef][-]?(\d+[a-z]?|\w{1,2})\b/gi
  const matches = problemLower.match(errorCodeRegex)
  
  return matches !== null
}

export async function diagnoseProblem(appliance: string, brand: string, problem: string, email: string): Promise<DiagnosisResult> {
  try {
    const openRouterApiKey = process.env.OPENROUTER_API_KEY

    if (!openRouterApiKey) {
      console.error('OpenRouter API key not found, using fallback')
      const fallbackResult = getFallbackDiagnosis(appliance, brand, problem)
      // Save fallback diagnosis to database
      await saveDiagnosticToDatabase(appliance, brand, problem, email, fallbackResult)
      return fallbackResult
    }

    // Check for error codes
    const hasErrorCode = checkErrorCode(brand, problem)
    const detectedErrorCode = detectErrorCode(problem)
    
    let errorCodeContext = ""
    
    if (detectedErrorCode && brand) {
      errorCodeContext = `

🔥 STOP - ERROR CODE DETECTED 🔥
"${detectedErrorCode}" is a SPECIFIC ERROR CODE for ${brand.toUpperCase()} ${appliance.toUpperCase()}

⚠️ CRITICAL INSTRUCTIONS - READ CAREFULLY:
1. "${detectedErrorCode}" is NOT a generic problem description
2. It is a SPECIFIC diagnostic code from ${brand.toUpperCase()} ${appliance.toLowerCase()} control system
3. You MUST look up what "${detectedErrorCode}" means for ${brand.toUpperCase()} ${appliance.toLowerCase()} specifically
4. DO NOT provide generic drain/water/heating advice unless that's what THIS specific error code indicates
5. Different appliance types have different error code meanings: washing machine ≠ dishwasher ≠ oven
6. If you don't know this exact error code for this appliance type, say so and recommend professional diagnosis

ERROR CODE LOOKUP REQUIRED:
- Brand: ${brand.toUpperCase()}
- Appliance: ${appliance.toUpperCase()}  
- Code: ${detectedErrorCode}
- Required: Look up the EXACT meaning of ${brand.toUpperCase()} ${appliance.toLowerCase()} error code ${detectedErrorCode}

DO NOT GUESS. DO NOT PROVIDE GENERIC REPAIR ADVICE. Look up this specific error code.`
    }

    // Enhanced system prompt with better error code handling
    const systemPrompt = `You are an expert appliance repair technician with 20+ years of experience specializing in all major UK appliance brands.

${errorCodeContext}

⚠️ IMPORTANT: When you see an error code, you must:
1. Recognize it as a specific diagnostic code from the appliance's control system
2. Look up what that EXACT error code means for that SPECIFIC brand and appliance type
3. Provide diagnosis based on that error code's meaning, not generic assumptions
4. NEVER provide generic water/drain/heating advice unless that's what the specific error code indicates

CRITICAL ERROR CODE EXAMPLES - MEMORIZE THESE:
- Beko washing machine E9 = door lock fault
- Beko washing machine E10 = door jammed (NOT water inlet)
- Beko washing machine E17 = excessive foam detected (NOT drain problems)
- Samsung washing machine 5E = drain error
- LG washing machine OE = drain error  
- Bosch washing machine E18 = drain pump issue

DO NOT CONFUSE ERROR CODES. Each brand/appliance combination has specific meanings.

Guidelines for ALL diagnoses:
- Use UK pricing in GBP (£) with cost range from £0 (DIY repair) to £149 (professional same-day service)
- For DIY repairs: £0 - £30 (just parts cost), for professional repairs: £109 - £149
- Professional service pricing: £109 (standard), £129 (next-day), £149 (same-day)
- Always use spaces around hyphens in costs and times (e.g., "£109 - £149", "2 - 3 hours")
- Difficulty levels: easy (basic tools, no electrical), moderate (some technical skill), difficult (electrical/complex), expert (specialized tools/dangerous)
- Recommend "professional" for difficult-expert repairs, bearing replacements, electrical issues, or safety concerns
- Recommend "diy" ONLY for easy-moderate repairs like cleaning, filter changes, or simple adjustments
- For washing machine bearing issues, drive belt problems, or mechanical repairs: ALWAYS recommend "professional"
- Always prioritize safety - if there's any electrical, gas, or safety risk, recommend professional
- Provide realistic time estimates with proper spacing around hyphens
- Include safety warnings for any potentially dangerous repairs
- For error codes you're not certain about, recommend professional diagnosis
- If dealing with an error code, mention in your serviceReason that this is a specific diagnostic code

Always respond with valid JSON in this exact format:
{
  "possibleCauses": ["cause1", "cause2", "cause3"],
  "recommendations": {
    "diy": ["diy step 1", "diy step 2"],
    "professional": ["professional service 1", "professional service 2"]
  },
  "urgency": "low|medium|high",
  "estimatedCost": "£X - £Y",
  "difficulty": "easy|moderate|difficult|expert",
  "recommendedService": "diy|professional|warranty",
  "serviceReason": "Clear explanation of why this service is recommended",
  "skillsRequired": ["skill1", "skill2"],
  "timeEstimate": "X - Y hours/days",
  "safetyWarnings": ["warning1", "warning2"]
}`

    const brandInfo = brand ? `Brand: ${brand}` : "Brand: Not specified"
    
    let userPrompt = `Appliance: ${appliance}
${brandInfo}
Problem: ${problem}`

    // Add error code emphasis to user prompt as well
    if (detectedErrorCode && brand) {
      userPrompt += `

🔥 CRITICAL: This is error code ${detectedErrorCode} on a ${brand.toUpperCase()} ${appliance.toLowerCase()}.
You MUST look up what ${brand.toUpperCase()} ${appliance.toLowerCase()} error code ${detectedErrorCode} specifically means.
Do NOT provide generic repair advice. Look up this exact error code for this brand and appliance type.`
    }

    userPrompt += `

Please diagnose this appliance problem, assess the repair difficulty, and recommend the most appropriate service option. If the brand is specified, please consider brand-specific error codes and common issues.`

    // Try primary model (Claude 3.5 Sonnet)
    let diagnosis = await callOpenRouter(
      'anthropic/claude-3.5-sonnet',
      systemPrompt,
      userPrompt,
      openRouterApiKey
    )

    if (diagnosis) {
      // Save successful AI diagnosis to database
      await saveDiagnosticToDatabase(appliance, brand, problem, email, diagnosis)
      return diagnosis
    }

    // Try fallback model (GPT-4o Mini)
    diagnosis = await callOpenRouter(
      'openai/gpt-4o-mini',
      systemPrompt,
      userPrompt,
      openRouterApiKey
    )

    if (diagnosis) {
      // Save fallback AI diagnosis to database
      await saveDiagnosticToDatabase(appliance, brand, problem, email, diagnosis)
      return diagnosis
    }

    // If both AI models fail, use structured fallback
    const fallbackResult = getFallbackDiagnosis(appliance, brand, problem)
    await saveDiagnosticToDatabase(appliance, brand, problem, email, fallbackResult)
    return fallbackResult

  } catch (error) {
    console.error("Diagnosis error:", error)
    const fallbackResult = getFallbackDiagnosis(appliance, brand, problem)
    // Save fallback diagnosis to database even on error
    await saveDiagnosticToDatabase(appliance, brand, problem, email, fallbackResult)
    return fallbackResult
  }
}

async function callOpenRouter(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<DiagnosisResult | null> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "RS Repairs Diagnostic Tool"
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    })

    if (!response.ok) {
      console.error(`OpenRouter API error for ${model}:`, response.status)
      return null
    }

    const data = await response.json()
    const aiResponse = data.choices[0].message.content

    // Parse and validate the JSON response
    const diagnosis = JSON.parse(aiResponse) as DiagnosisResult

    // Validate the response structure
    if (
      !diagnosis.possibleCauses ||
      !diagnosis.recommendations ||
      !diagnosis.difficulty ||
      !diagnosis.recommendedService
    ) {
      console.error("Invalid response structure from AI")
      return null
    }

    // Force professional recommendation for complex repairs
    if (diagnosis.difficulty === "difficult" || diagnosis.difficulty === "expert" ||
        diagnosis.estimatedCost.includes("£109") || diagnosis.estimatedCost.includes("£129") || diagnosis.estimatedCost.includes("£149")) {
      diagnosis.recommendedService = "professional"
      diagnosis.serviceReason = "Professional service needed for this repair"
    }

    return diagnosis

  } catch (error) {
    console.error(`Error calling OpenRouter with ${model}:`, error)
    return null
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
      // Don't throw error - let the diagnosis continue even if DB save fails
    } else {
      console.log('Diagnostic saved to database successfully')
    }

    return data
  } catch (error) {
    console.error('Failed to save diagnostic to database:', error)
    // Don't throw error - let the diagnosis continue even if DB save fails
  }
}

function getFallbackDiagnosis(appliance: string, brand: string, problem: string): DiagnosisResult {
  // Check for error codes in fallback too
  const errorCodeInfo = checkErrorCode(brand, problem)
  const detectedErrorCode = detectErrorCode(problem)
  
  // Intelligent fallback based on appliance type
  const isElectrical = appliance.toLowerCase().includes('oven') || 
                      appliance.toLowerCase().includes('cooker') ||
                      appliance.toLowerCase().includes('microwave')
  
  const isWaterRelated = appliance.toLowerCase().includes('washing') ||
                        appliance.toLowerCase().includes('dishwasher') ||
                        appliance.toLowerCase().includes('dryer')

  const isRefrigeration = appliance.toLowerCase().includes('fridge') ||
                         appliance.toLowerCase().includes('freezer')

  const brandText = brand ? ` (${brand})` : ""

  // Use error code info if available
  if (errorCodeInfo) {
    return {
      possibleCauses: errorCodeInfo.causes,
      recommendations: {
        diy: [
          "Check power connections and ensure appliance is plugged in properly",
          "Inspect for any visible obstructions or damage",
          "Consult your user manual for basic troubleshooting steps",
          "Verify appliance settings are correct"
        ],
        professional: [
          "Professional diagnostic inspection with specialized equipment",
          "Component replacement using genuine parts",
          "Safety check and performance testing",
          "Error code specific repair procedures"
        ],
      },
      urgency: errorCodeInfo.urgency,
      estimatedCost: errorCodeInfo.difficulty === "easy" ? "£0 - £30" : "£109 - £149",
      difficulty: errorCodeInfo.difficulty,
      recommendedService: errorCodeInfo.difficulty === "easy" ? "diy" : "professional",
      serviceReason: `This error code indicates ${errorCodeInfo.meaning.toLowerCase()}. ${errorCodeInfo.difficulty === "easy" ? "Try DIY solutions first." : "Professional service recommended for safe and accurate repair."}`,
      skillsRequired: errorCodeInfo.difficulty === "easy" ? ["Basic tools"] : ["Electrical knowledge", "Appliance repair experience"],
      timeEstimate: errorCodeInfo.difficulty === "easy" ? "30 - 60 minutes" : "1 - 2 hours",
      safetyWarnings: [
        "Always disconnect power before attempting any repairs",
        "If unsure about any step, contact a professional",
        "Be careful with electrical components"
      ]
    }
  }

  // Enhanced fallback for detected error codes not in database
  if (detectedErrorCode && brand) {
    return {
      possibleCauses: [
        `${brand} error code ${detectedErrorCode} indicates a specific system fault`,
        "Component malfunction requiring diagnostic equipment",
        "Sensor or control board communication error",
        "Brand-specific technical issue"
      ],
      recommendations: {
        diy: [
          "Power cycle the appliance (unplug for 2 minutes, then restart)",
          "Check for any obvious blockages or obstructions",
          "Verify all connections are secure",
          "Consult your user manual for error code information"
        ],
        professional: [
          `Professional diagnosis of ${brand} error code ${detectedErrorCode}`,
          "Specialized diagnostic equipment to identify exact fault",
          "Brand-specific repair procedures and genuine parts",
          "Complete system testing after repair"
        ],
      },
      urgency: "medium",
      estimatedCost: "£109 - £149",
      difficulty: "expert",
      recommendedService: "professional",
      serviceReason: `Error code ${detectedErrorCode} on ${brand} appliances requires professional diagnosis with specialized equipment to identify the exact component failure and ensure safe repair.`,
      skillsRequired: ["Specialized diagnostic tools", "Brand-specific technical knowledge"],
      timeEstimate: "1 - 2 hours",
      safetyWarnings: [
        "Always disconnect power before attempting any inspection",
        "Error codes often indicate electrical or safety-critical faults",
        "Professional diagnosis recommended for accurate identification"
      ]
    }
  }

  // Standard fallback if no error code detected
  return {
    possibleCauses: [
      `${appliance}${brandText} component wear and tear`,
      isElectrical ? "Electrical connection issues" : isWaterRelated ? "Water system blockage" : "Mechanical component failure",
      "Internal sensor or control board malfunction",
      "Regular maintenance required"
    ],
    recommendations: {
      diy: [
        "Check power connections and ensure appliance is plugged in properly",
        isWaterRelated ? "Clean filters and check for blockages" : "Clean any visible debris or buildup",
        "Consult your user manual for basic troubleshooting steps",
        "Verify appliance settings are correct"
      ],
      professional: [
        "Professional diagnostic inspection with specialized equipment",
        "Component replacement using genuine parts",
        "Safety check and performance testing",
        "Preventive maintenance recommendations"
      ],
    },
    urgency: problem.toLowerCase().includes('sparking') || problem.toLowerCase().includes('smoke') ? "high" : "medium",
    estimatedCost: isRefrigeration ? "£0 - £149" : isElectrical ? "£109 - £149" : "£0 - £149",
    difficulty: isElectrical || problem.toLowerCase().includes('electrical') ? "expert" : "moderate",
    recommendedService: isElectrical || problem.toLowerCase().includes('electrical') || problem.toLowerCase().includes('sparking') ? "professional" : "professional",
    serviceReason: "This issue requires professional assessment to ensure safe and proper repair. Our certified technicians can provide accurate diagnosis and quality repairs.",
    skillsRequired: undefined,
    timeEstimate: "45 - 90 minutes",
    safetyWarnings: isElectrical ? [
      "Always disconnect power before attempting any inspection",
      "Electrical repairs should only be performed by qualified technicians",
      "Never attempt repairs on live electrical components"
    ] : isWaterRelated ? [
      "Turn off water supply before inspection",
      "Ensure appliance is completely drained",
      "Check for water leaks around connections"
    ] : [
      "Always disconnect power before attempting any repairs",
      "Some appliance components may be under pressure",
      "Professional service recommended for safety"
    ]
  }
}

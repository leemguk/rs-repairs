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

// Function to get error code meaning by calling another AI specifically for error codes
async function getErrorCodeMeaning(errorCode: string, brand: string, appliance: string, apiKey: string): Promise<string | null> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "RS Repairs Error Code Lookup"
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          { 
            role: "system", 
            content: `You are an expert appliance repair technician specializing in error code interpretation. Your job is to provide the exact meaning of specific error codes for specific appliance brands and types.

CRITICAL INSTRUCTIONS:
- You will be given a specific error code, brand, and appliance type
- Provide ONLY the specific meaning of that error code for that exact combination
- If you don't know the exact meaning, say "UNKNOWN"
- Do not provide repair advice, just the error code meaning
- Be precise and specific to the brand and appliance type

Respond with ONLY the error code meaning, nothing else.` 
          },
          { 
            role: "user", 
            content: `What does error code ${errorCode} mean specifically for a ${brand} ${appliance}?

Provide only the meaning of this specific error code for this specific brand and appliance type. If you don't know the exact meaning, respond with "UNKNOWN".` 
          }
        ],
        max_tokens: 150,
        temperature: 0.1
      })
    })

    if (!response.ok) {
      console.error(`Error code lookup API error:`, response.status)
      return null
    }

    const data = await response.json()
    const meaning = data.choices[0].message.content.trim()
    
    if (meaning === "UNKNOWN" || meaning.length < 10) {
      return null
    }
    
    return meaning

  } catch (error) {
    console.error(`Error looking up error code:`, error)
    return null
  }
}

export async function diagnoseProblem(appliance: string, brand: string, problem: string, email: string): Promise<DiagnosisResult> {
  try {
    const openRouterApiKey = process.env.OPENROUTER_API_KEY

    if (!openRouterApiKey) {
      console.error('OpenRouter API key not found, using fallback')
      const fallbackResult = getFallbackDiagnosis(appliance, brand, problem)
      await saveDiagnosticToDatabase(appliance, brand, problem, email, fallbackResult)
      return fallbackResult
    }

    // Step 1: Check if there's an error code in the problem
    const detectedErrorCode = detectErrorCode(problem)
    let errorCodeMeaning: string | null = null
    
    // Step 2: If error code found and we have brand, look up its meaning
    if (detectedErrorCode && brand) {
      console.log(`Looking up error code ${detectedErrorCode} for ${brand} ${appliance}`)
      errorCodeMeaning = await getErrorCodeMeaning(detectedErrorCode, brand, appliance, openRouterApiKey)
      console.log(`Error code meaning:`, errorCodeMeaning)
    }

    // Step 3: Build the system prompt based on whether we have error code meaning
    let systemPrompt = `You are an expert appliance repair technician with 20+ years of experience specializing in all major UK appliance brands.`

    if (errorCodeMeaning) {
      systemPrompt += `

🔥 ERROR CODE ANALYSIS REQUIRED 🔥

CRITICAL INFORMATION:
- Error Code: ${detectedErrorCode}
- Brand: ${brand}
- Appliance: ${appliance}
- ERROR CODE MEANING: ${errorCodeMeaning}

MANDATORY INSTRUCTIONS:
1. The error code ${detectedErrorCode} on this ${brand} ${appliance} means: ${errorCodeMeaning}
2. Base your ENTIRE diagnosis on this specific error code meaning
3. The possible causes should relate directly to what causes this specific error
4. The recommendations should address how to fix this specific error
5. Do NOT provide generic appliance advice - focus on this specific error code

Your diagnosis MUST be based on what "${errorCodeMeaning}" indicates is wrong with the appliance.`
    }

    systemPrompt += `

Guidelines for ALL diagnoses:
- Use UK pricing in GBP (£) with cost range from £0 (DIY repair) to £149 (professional same-day service)
- For DIY repairs: £0 - £30 (just parts cost), for professional repairs: £109 - £149
- Professional service pricing: £109 (standard), £129 (next-day), £149 (same-day)
- Always use spaces around hyphens in costs and times (e.g., "£109 - £149", "2 - 3 hours")
- Difficulty levels: easy (basic tools, no electrical), moderate (some technical skill), difficult (electrical/complex), expert (specialized tools/dangerous)
- Recommend "professional" for difficult-expert repairs, bearing replacements, electrical issues, or safety concerns
- Recommend "diy" ONLY for easy-moderate repairs like cleaning, filter changes, or simple adjustments
- Always prioritize safety - if there's any electrical, gas, or safety risk, recommend professional
- Provide realistic time estimates with proper spacing around hyphens
- Include safety warnings for any potentially dangerous repairs

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

    // Step 4: Build user prompt
    const brandInfo = brand ? `Brand: ${brand}` : "Brand: Not specified"
    
    let userPrompt = `Appliance: ${appliance}
${brandInfo}
Problem: ${problem}`

    if (errorCodeMeaning) {
      userPrompt += `

IMPORTANT: This diagnosis is for error code ${detectedErrorCode} which means: ${errorCodeMeaning}

Please provide a complete diagnosis focusing specifically on what causes this error and how to fix it.`
    }

    userPrompt += `

Please diagnose this appliance problem, assess the repair difficulty, and recommend the most appropriate service option.`

    // Step 5: Get AI diagnosis
    let diagnosis = await callOpenRouter(
      'anthropic/claude-3.5-sonnet',
      systemPrompt,
      userPrompt,
      openRouterApiKey
    )

    if (diagnosis) {
      await saveDiagnosticToDatabase(appliance, brand, problem, email, diagnosis)
      return diagnosis
    }

    // Try fallback model
    diagnosis = await callOpenRouter(
      'openai/gpt-4o-mini',
      systemPrompt,
      userPrompt,
      openRouterApiKey
    )

    if (diagnosis) {
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

    const diagnosis = JSON.parse(aiResponse) as DiagnosisResult

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
    if (diagnosis.difficulty === "difficult" || diagnosis.difficulty === "expert") {
      diagnosis.recommendedService = "professional"
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

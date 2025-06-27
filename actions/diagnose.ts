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

export async function diagnoseProblem(appliance: string, problem: string, email: string): Promise<DiagnosisResult> {
  try {
    const openRouterApiKey = process.env.OPENROUTER_API_KEY

    if (!openRouterApiKey) {
      console.error('OpenRouter API key not found, using fallback')
      const fallbackResult = getFallbackDiagnosis(appliance, problem)
      // Save fallback diagnosis to database
      await saveDiagnosticToDatabase(appliance, problem, email, fallbackResult)
      return fallbackResult
    }

    const systemPrompt = `You are an expert appliance repair technician with 20+ years of experience. 
    Analyze appliance problems and provide diagnostic information in a structured format.
    
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
    }
    
    Guidelines:
    - Use UK pricing in GBP (£) with cost range from £0 (DIY repair) to £149 (professional same-day service)
    - For DIY repairs: £0 - £30 (just parts cost), for professional repairs: £109 - £149
    - Professional service pricing: £109 (standard), £129 (next-day), £149 (same-day)
    - Always use spaces around hyphens in costs and times (e.g., "£109 - £149", "2 - 3 hours")
    - Difficulty levels: easy (basic tools, no electrical), moderate (some technical skill), difficult (electrical/complex), expert (specialized tools/dangerous)
    - Recommend "diy" for easy-moderate repairs, "professional" for difficult-expert or safety concerns, "warranty" for expensive/complex issues on older appliances
    - Always prioritize safety - if there's any electrical, gas, or safety risk, recommend professional
    - Provide realistic time estimates with proper spacing around hyphens
    - Include safety warnings for any potentially dangerous repairs`

    const userPrompt = `Appliance: ${appliance}
Problem: ${problem}

Please diagnose this appliance problem, assess the repair difficulty, and recommend the most appropriate service option.`

    // Try primary model (Claude 3.5 Sonnet)
    let diagnosis = await callOpenRouter(
      'anthropic/claude-3.5-sonnet',
      systemPrompt,
      userPrompt,
      openRouterApiKey
    )

    if (diagnosis) {
      // Save successful AI diagnosis to database
      await saveDiagnosticToDatabase(appliance, problem, email, diagnosis)
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
      await saveDiagnosticToDatabase(appliance, problem, email, diagnosis)
      return diagnosis
    }

    // If both AI models fail, use structured fallback
    const fallbackResult = getFallbackDiagnosis(appliance, problem)
    await saveDiagnosticToDatabase(appliance, problem, email, fallbackResult)
    return fallbackResult

  } catch (error) {
    console.error("Diagnosis error:", error)
    const fallbackResult = getFallbackDiagnosis(appliance, problem)
    // Save fallback diagnosis to database even on error
    await saveDiagnosticToDatabase(appliance, problem, email, fallbackResult)
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

    return diagnosis

  } catch (error) {
    console.error(`Error calling OpenRouter with ${model}:`, error)
    return null
  }
}

async function saveDiagnosticToDatabase(
  appliance: string, 
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

function getFallbackDiagnosis(appliance: string, problem: string): DiagnosisResult {
  // Intelligent fallback based on appliance type
  const isElectrical = appliance.toLowerCase().includes('oven') || 
                      appliance.toLowerCase().includes('cooker') ||
                      appliance.toLowerCase().includes('microwave')
  
  const isWaterRelated = appliance.toLowerCase().includes('washing') ||
                        appliance.toLowerCase().includes('dishwasher') ||
                        appliance.toLowerCase().includes('dryer')

  const isRefrigeration = appliance.toLowerCase().includes('fridge') ||
                         appliance.toLowerCase().includes('freezer')

  return {
    possibleCauses: [
      `${appliance} component wear and tear`,
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

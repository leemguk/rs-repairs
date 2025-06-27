"use server"

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

export async function diagnoseProblem(appliance: string, problem: string): Promise<DiagnosisResult> {
  try {
    const openRouterApiKey = process.env.OPENROUTER_API_KEY

    if (!openRouterApiKey) {
      console.error('OpenRouter API key not found, using fallback')
      return getFallbackDiagnosis(appliance, problem)
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
      "timeEstimate": "X hours/days",
      "safetyWarnings": ["warning1", "warning2"]
    }
    
    Guidelines:
    - Use UK pricing in GBP (£)
    - Difficulty levels: easy (basic tools, no electrical), moderate (some technical skill), difficult (electrical/complex), expert (specialized tools/dangerous)
    - Recommend "diy" for easy-moderate repairs, "professional" for difficult-expert or safety concerns, "warranty" for expensive/complex issues on older appliances
    - Always prioritize safety - if there's any electrical, gas, or safety risk, recommend professional
    - Provide realistic time estimates
    - Include safety warnings for any potentially dangerous repairs`

    const userPrompt = `Appliance: ${appliance}
Problem: ${problem}

Please diagnose this appliance problem, assess the repair difficulty, and recommend the most appropriate service option.`

    // Try primary model (Claude 3.5 Sonnet)
    const diagnosis = await callOpenRouter(
      'anthropic/claude-3.5-sonnet',
      systemPrompt,
      userPrompt,
      openRouterApiKey
    )

    if (diagnosis) {
      return diagnosis
    }

    // Try fallback model (GPT-4o Mini)
    const fallbackDiagnosis = await callOpenRouter(
      'openai/gpt-4o-mini',
      systemPrompt,
      userPrompt,
      openRouterApiKey
    )

    if (fallbackDiagnosis) {
      return fallbackDiagnosis
    }

    // If both AI models fail, use structured fallback
    return getFallbackDiagnosis(appliance, problem)

  } catch (error) {
    console.error("Diagnosis error:", error)
    return getFallbackDiagnosis(appliance, problem)
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
    estimatedCost: isRefrigeration ? "£120 - £200" : isElectrical ? "£109 - £180" : "£109 - £160",
    difficulty: isElectrical || problem.toLowerCase().includes('electrical') ? "expert" : "moderate",
    recommendedService: isElectrical || problem.toLowerCase().includes('electrical') || problem.toLowerCase().includes('sparking') ? "professional" : "professional",
    serviceReason: "This issue requires professional assessment to ensure safe and proper repair. Our certified technicians can provide accurate diagnosis and quality repairs.",
    skillsRequired: undefined,
    timeEstimate: "45-90 minutes",
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

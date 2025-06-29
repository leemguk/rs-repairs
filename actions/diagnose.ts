"use server"

import { supabase } from '@/lib/supabase'

interface DiagnosisResult {
  errorCodeMeaning?: string
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
    /\b(\d{1,2}[ef])\b/gi,
    /\b([a-z]{1,2}\d{1,2})\b/gi,
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

// Validate AI error code response
function validateErrorCodeResponse(response: string, expectedBrand: string, expectedCode: string): boolean {
  if (!response || !expectedBrand || !expectedCode) return false
  
  const responseLower = response.toLowerCase()
  const brandLower = expectedBrand.toLowerCase()
  const codeLower = expectedCode.toLowerCase()
  
  // Must mention the correct brand
  const hasBrand = responseLower.includes(brandLower)
  
  // Must mention the correct error code
  const hasCode = responseLower.includes(codeLower)
  
  // Must not mention other brands (common confusion)
  const otherBrands = ['samsung', 'lg', 'whirlpool', 'hotpoint', 'indesit', 'zanussi', 'aeg', 'electrolux', 'miele', 'siemens', 'neff', 'gaggenau', 'fisher', 'paykel', 'ge', 'kenmore', 'maytag', 'frigidaire', 'haier', 'hisense', 'beko', 'candy', 'hoover', 'smeg', 'bauknecht', 'grundig']
  const mentionsOtherBrand = otherBrands
    .filter(brand => brand !== brandLower)
    .some(brand => responseLower.includes(brand))
  
  console.log(`Validation: brand=${hasBrand}, code=${hasCode}, otherBrand=${mentionsOtherBrand}`)
  
  return hasBrand && hasCode && !mentionsOtherBrand
}

// Improved AI prompt for more structured responses
async function diagnoseWithAI(
  appliance: string,
  brand: string, 
  problem: string,
  errorCode: string | null,
  apiKey: string
): Promise<DiagnosisResult | null> {
  try {
    const errorCodeText = errorCode ? ` showing error code ${errorCode}` : ''
    
    const prompt = `You are a professional appliance repair technician with access to manufacturer documentation. A customer has a ${brand} ${appliance}${errorCodeText} with this problem: "${problem}"

${errorCode ? `
CRITICAL INSTRUCTION: You MUST provide accurate information about error code ${errorCode} specifically for ${brand} appliances. 

- If you know what ${errorCode} means on ${brand} ${appliance}, explain it precisely
- If you are unsure about ${errorCode} on ${brand} specifically, state: "I don't have specific information about error code ${errorCode} for ${brand} appliances"
- DO NOT provide information about other brands or other error codes
- DO NOT guess or provide generic error code information

` : ''}

Please provide a comprehensive diagnosis using this EXACT format:

**ERROR CODE MEANING:** ${errorCode ? `[State exactly what error code ${errorCode} means on ${brand} ${appliance} models, or clearly state if you don't have specific information for this brand/code combination]` : 'N/A - No error code present'}

**POSSIBLE CAUSES:**
1. [Most likely cause with brief explanation]
2. [Second most likely cause]
3. [Third possible cause]
4. [Fourth possible cause if applicable]
5. [Fifth possible cause if applicable]

**DIY RECOMMENDATIONS:**
• [Specific step customer can try - be detailed]
• [Second DIY step with clear instructions]
• [Third DIY step if safe and appropriate]
• [Fourth DIY step if applicable]
• [Fifth DIY step if applicable]
• [When to stop DIY and call professional]

**PROFESSIONAL SERVICES:**
• [Specific professional diagnostic service needed]
• [Equipment/tools professional would use]
• [Type of repair/replacement typically required]
• [Professional testing after repair]
• [Warranty coverage and follow-up service]
• [Additional professional services if needed]

**SERVICE TYPE:** DIY or PROFESSIONAL
**DIFFICULTY:** Easy, Moderate, Difficult, or Expert
**URGENCY:** Low, Medium, or High
**TIME ESTIMATE:** [Realistic time range]
**COST ESTIMATE:** [Range in £, max £149 for professional]
**SKILLS NEEDED:** [Specific skills required]

**SAFETY WARNINGS:**
• [Specific safety concern for this problem]
• [Power/electrical safety if applicable]
• [When to immediately stop and call professional]

**SERVICE REASON:** [Detailed explanation of why DIY or professional service is recommended for this specific issue]

Be specific to ${brand} ${appliance} and the exact problem described. Provide actionable, detailed recommendations.`

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "RS Repairs AI Diagnosis"
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
        temperature: 0.1
      })
    })

    if (!response.ok) {
      console.error(`AI diagnosis failed: ${response.status}`)
      return null
    }

    const data = await response.json()
    const aiResponse = data.choices[0]?.message?.content?.trim()
    
    if (!aiResponse) {
      console.error('No AI response received')
      return null
    }

    console.log('AI Response:', aiResponse)
    
    return parseAIResponse(aiResponse, appliance, brand, problem, errorCode)

  } catch (error) {
    console.error('Error in AI diagnosis:', error)
    return null
  }
}

// Completely rewritten parsing function to extract AI content properly
function parseAIResponse(
  aiResponse: string, 
  appliance: string, 
  brand: string, 
  problem: string,
  errorCode: string | null
): DiagnosisResult {
  
  // Extract sections using more flexible parsing
  const sections = {
    errorCodeMeaning: extractSimpleField(aiResponse, ['ERROR CODE MEANING']),
    causes: extractSection(aiResponse, ['POSSIBLE CAUSES', 'CAUSES']),
    diyRecs: extractSection(aiResponse, ['DIY RECOMMENDATIONS', 'DIY STEPS', 'DIY']),
    professionalRecs: extractSection(aiResponse, ['PROFESSIONAL SERVICES', 'PROFESSIONAL']),
    serviceType: extractSimpleField(aiResponse, ['SERVICE TYPE', 'SERVICE']),
    difficulty: extractSimpleField(aiResponse, ['DIFFICULTY']),
    urgency: extractSimpleField(aiResponse, ['URGENCY']),
    timeEstimate: extractSimpleField(aiResponse, ['TIME ESTIMATE', 'TIME']),
    costEstimate: extractSimpleField(aiResponse, ['COST ESTIMATE', 'COST']),
    skillsNeeded: extractSimpleField(aiResponse, ['SKILLS NEEDED', 'SKILLS']),
    safetyWarnings: extractSection(aiResponse, ['SAFETY WARNINGS', 'SAFETY']),
    serviceReason: extractSimpleField(aiResponse, ['SERVICE REASON', 'REASON'])
  }

  // Extract error code meaning if present and validate it
  let errorCodeMeaning = undefined
  if (sections.errorCodeMeaning && !sections.errorCodeMeaning.includes('N/A')) {
    // Validate that the AI response is accurate for the requested brand/code
    if (errorCode && brand) {
      const isValid = validateErrorCodeResponse(sections.errorCodeMeaning, brand, errorCode)
      if (isValid) {
        errorCodeMeaning = sections.errorCodeMeaning
        console.log('Error code meaning validated and accepted')
      } else {
        console.log(`Error code meaning rejected - AI provided incorrect information for ${brand} ${errorCode}`)
        console.log(`AI Response: ${sections.errorCodeMeaning}`)
        // Don't use the incorrect error code meaning
        errorCodeMeaning = undefined
      }
    } else {
      // No error code to validate against, use as-is
      errorCodeMeaning = sections.errorCodeMeaning
    }
  }

  // Parse possible causes from AI response
  const possibleCauses = sections.causes.length > 0 ? sections.causes : [
    `${brand} ${appliance}${errorCode ? ` error ${errorCode}` : ''} - ${problem}`
  ]

  // Parse DIY recommendations from AI response - ensure we get up to 6 items
  const diyRecommendations = sections.diyRecs.length > 0 ? sections.diyRecs : [
    "Check power connection and restart appliance",
    "Verify settings are correct for intended operation",
    "Consult user manual for basic troubleshooting",
    "Contact professional if basic steps don't resolve issue"
  ]

  // Parse professional recommendations from AI response - ensure we get up to 6 items
  const professionalRecommendations = sections.professionalRecs.length > 0 ? sections.professionalRecs : [
    `Professional diagnosis of ${brand} ${appliance}`,
    "Specialized diagnostic equipment and tools",
    "Expert repair with genuine replacement parts",
    "Complete testing and warranty on repair work",
    "Follow-up service and support",
    "Certified technician assessment"
  ]

  // Parse service type
  const serviceTypeText = sections.serviceType.toLowerCase()
  let recommendedService: "diy" | "professional" | "warranty" = 'professional'
  
  if (serviceTypeText.includes('diy')) {
    recommendedService = 'diy'
  } else if (serviceTypeText.includes('warranty')) {
    recommendedService = 'warranty'
  }

  // Parse difficulty
  const difficultyText = sections.difficulty.toLowerCase()
  let difficulty: "easy" | "moderate" | "difficult" | "expert" = 'moderate'
  
  if (difficultyText.includes('easy')) difficulty = 'easy'
  else if (difficultyText.includes('moderate')) difficulty = 'moderate'
  else if (difficultyText.includes('difficult')) difficulty = 'difficult'
  else if (difficultyText.includes('expert')) difficulty = 'expert'

  // Parse urgency
  const urgencyText = sections.urgency.toLowerCase()
  let urgency: "low" | "medium" | "high" = 'medium'
  
  if (urgencyText.includes('low')) urgency = 'low'
  else if (urgencyText.includes('high')) urgency = 'high'

  // Parse time estimate from AI or set default
  let timeEstimate = sections.timeEstimate || "1-2 hours"
  if (recommendedService === 'diy' && !timeEstimate.includes('minutes')) {
    timeEstimate = "30-60 minutes"
  }

  // Parse cost estimate with £149 cap
  let estimatedCost = sections.costEstimate || "£109-£149"
  if (recommendedService === 'diy') {
    estimatedCost = extractDIYCost(estimatedCost) || "£0-£50"
  } else {
    estimatedCost = capProfessionalCost(estimatedCost)
  }

  // Parse skills from AI response
  const skillsText = sections.skillsNeeded
  let skillsRequired: string[] = []
  
  if (skillsText) {
    skillsRequired = skillsText.split(',').map(s => s.trim()).filter(s => s.length > 0)
  }
  
  if (skillsRequired.length === 0) {
    skillsRequired = recommendedService === 'diy' 
      ? ["Basic tools", "Manual reading", "Safety awareness"]
      : ["Specialized diagnostic equipment", "Professional training", "Technical expertise"]
  }

  // Parse safety warnings from AI response
  const safetyWarnings = sections.safetyWarnings.length > 0 ? sections.safetyWarnings : [
    "Always disconnect power before attempting any inspection",
    "If unsure about any step, contact professional service immediately"
  ]

  // Use AI service reason or create appropriate default
  let serviceReason = sections.serviceReason
  if (!serviceReason || serviceReason.length < 20) {
    serviceReason = recommendedService === 'diy'
      ? `Basic troubleshooting steps can be safely attempted for this ${brand} ${appliance} issue before requiring professional service.`
      : `This ${brand} ${appliance} issue requires professional diagnosis with specialized equipment for safe and accurate repair.`
  }

  const result: DiagnosisResult = {
    errorCodeMeaning,
    possibleCauses: possibleCauses.slice(0, 5),
    recommendations: {
      diy: diyRecommendations.slice(0, 6),
      professional: professionalRecommendations.slice(0, 6)
    },
    urgency,
    estimatedCost,
    difficulty,
    recommendedService,
    serviceReason,
    skillsRequired: skillsRequired.slice(0, 4),
    timeEstimate,
    safetyWarnings: safetyWarnings.slice(0, 4)
  }
  
  console.log('Parsed diagnosis result:', JSON.stringify(result, null, 2))
  return result
}

// Helper function to extract bulleted/numbered sections
function extractSection(text: string, sectionNames: string[]): string[] {
  for (const sectionName of sectionNames) {
    const regex = new RegExp(`\\*\\*${sectionName}[:\\*]*\\*\\*([\\s\\S]*?)(?=\\*\\*[A-Z]|$)`, 'i')
    const match = text.match(regex)
    
    if (match) {
      const sectionText = match[1].trim()
      const items: string[] = []
      
      // Split by bullet points, numbers, or line breaks
      const lines = sectionText.split(/\n/)
      
      for (const line of lines) {
        const cleanLine = line.replace(/^[•\-\*]\s*/, '').replace(/^\d+\.\s*/, '').trim()
        if (cleanLine.length > 10 && cleanLine.length < 200) {
          items.push(cleanLine)
        }
      }
      
      if (items.length > 0) {
        return items
      }
    }
  }
  
  return []
}

// Helper function to extract simple field values
function extractSimpleField(text: string, fieldNames: string[]): string {
  for (const fieldName of fieldNames) {
    const regex = new RegExp(`\\*\\*${fieldName}[:\\*]*\\*\\*\\s*([^\\n\\*]+(?:\\n(?!\\*\\*)[^\\n]*)*?)(?=\\n\\*\\*|$)`, 'i')
    const match = text.match(regex)
    
    if (match) {
      return match[1].trim()
    }
  }
  
  return ''
}

// Helper function to extract DIY cost from mixed cost info
function extractDIYCost(costText: string): string | null {
  if (costText.includes('DIY') || costText.includes('£0')) {
    const diyMatch = costText.match(/DIY[^:]*:?\s*(£[\d\-£\s]+)/i)
    if (diyMatch) return diyMatch[1].trim()
    
    const freeMatch = costText.match(/(£0[^£]*£\d+)/i)
    if (freeMatch) return freeMatch[1].trim()
  }
  
  return null
}

// Helper function to cap professional costs at £149
function capProfessionalCost(costText: string): string {
  if (!costText.includes('£')) {
    return '£109-£149'
  }
  
  // Extract cost ranges and cap them
  const costMatch = costText.match(/£(\d+)\s*[-–]\s*£(\d+)/)
  if (costMatch) {
    const minCost = Math.max(parseInt(costMatch[1]), 80)
    const maxCost = Math.min(parseInt(costMatch[2]), 149)
    return `£${minCost}-£${maxCost}`
  }
  
  // Single cost value
  const singleMatch = costText.match(/£(\d+)/)
  if (singleMatch) {
    const cost = Math.min(parseInt(singleMatch[1]), 149)
    return cost < 100 ? `£${cost}-£149` : `£109-£${cost}`
  }
  
  return '£109-£149'
}

// Main diagnosis function - simplified to always use AI
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
      return getEmergencyFallback(appliance, brand, problem)
    }

    // Detect error code if present
    const detectedErrorCode = detectErrorCode(problem)
    console.log(`Analyzing: ${brand} ${appliance} - ${problem}${detectedErrorCode ? ` (Error: ${detectedErrorCode})` : ''}`)

    // Always use AI for diagnosis - no separate error code handling
    const aiResult = await diagnoseWithAI(
      appliance,
      brand,
      problem,
      detectedErrorCode,
      openRouterApiKey
    )

    if (aiResult) {
      console.log('AI diagnosis successful')
      await saveDiagnosticToDatabase(appliance, brand, problem, email, aiResult)
      return aiResult
    }

    // Only use fallback if AI completely fails
    console.log('AI diagnosis failed, using emergency fallback')
    const fallbackResult = getEmergencyFallback(appliance, brand, problem)
    await saveDiagnosticToDatabase(appliance, brand, problem, email, fallbackResult)
    return fallbackResult

  } catch (error) {
    console.error("Diagnosis error:", error)
    const fallbackResult = getEmergencyFallback(appliance, brand, problem)
    await saveDiagnosticToDatabase(appliance, brand, problem, email, fallbackResult)
    return fallbackResult
  }
}

// Minimal emergency fallback - only used when API is completely unavailable
function getEmergencyFallback(appliance: string, brand: string, problem: string): DiagnosisResult {
  const isSafetyIssue = problem.toLowerCase().includes('smoke') || 
                       problem.toLowerCase().includes('sparking') || 
                       problem.toLowerCase().includes('burning')

  return {
    possibleCauses: [
      `${brand} ${appliance} - ${problem}`,
      "Diagnostic system temporarily unavailable",
      "Professional inspection recommended for accurate assessment"
    ],
    recommendations: {
      diy: [
        "Disconnect power immediately for safety",
        "Check that all connections are secure",
        "Verify appliance settings are appropriate",
        "Do not attempt operation until professionally inspected"
      ],
      professional: [
        `Emergency diagnostic service for ${brand} ${appliance}`,
        "Complete safety inspection and testing", 
        "Professional repair with warranty coverage",
        "Certified technician assessment"
      ]
    },
    urgency: isSafetyIssue ? "high" : "medium",
    estimatedCost: "£109-£149",
    difficulty: "expert",
    recommendedService: "professional",
    serviceReason: "Diagnostic system unavailable - professional inspection required for safety and accurate diagnosis.",
    skillsRequired: ["Professional certification", "Specialized equipment"],
    timeEstimate: "1-2 hours",
    safetyWarnings: isSafetyIssue ? [
      "IMMEDIATE SAFETY RISK - Disconnect power now",
      "Do not operate appliance until professionally inspected",
      "Contact emergency repair service immediately"
    ] : [
      "Disconnect power before any inspection",
      "Professional diagnosis required for warranty protection"
    ]
  }
}

// Database save function (unchanged)
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

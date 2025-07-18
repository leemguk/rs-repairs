//force update
"use server"

import { supabase } from '@/lib/supabase'
import { validateEmail, validateTextField } from '@/lib/validation'

// Server-safe sanitization function
function sanitizeForServer(input: string, maxLength: number = 500): string {
  if (!input || typeof input !== 'string') return ''
  
  return input
    .trim()
    .replace(/<script[\s\S]*?<\/script>/gi, '') // Remove script tags
    .replace(/<iframe[\s\S]*?>/gi, '') // Remove iframes
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/<[^>]+>/g, '') // Remove all HTML tags
    .slice(0, maxLength) // Enforce max length
}

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour in milliseconds
const RATE_LIMIT_MAX_REQUESTS = 5 // Max 5 requests per hour per email

function checkRateLimit(email: string): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(email)
  
  if (!userLimit || now > userLimit.resetTime) {
    // No limit or limit expired, create new window
    rateLimitMap.set(email, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    })
    return true
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    console.log(`Rate limit exceeded for ${email}: ${userLimit.count} requests`)
    return false
  }
  
  // Increment count
  userLimit.count++
  rateLimitMap.set(email, userLimit)
  return true
}

// Clean up old entries periodically (every hour)
setInterval(() => {
  const now = Date.now()
  for (const [email, limit] of rateLimitMap.entries()) {
    if (now > limit.resetTime) {
      rateLimitMap.delete(email)
    }
  }
}, RATE_LIMIT_WINDOW)

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
  sourceUrls?: string[]
}

interface SearchResult {
  title: string
  url: string
  snippet: string
}

// Enhanced error code detection
function detectErrorCode(problem: string): string | null {
  const problemLower = problem.toLowerCase()
  
  const errorCodePatterns = [
    /\b[ef][-\s]?(\d{1,3}[a-z]?)\b/gi,              // E13, F-13, E 13
    /\berror\s+code\s*[:\-]?\s*([a-z]?\d{1,3}[a-z]?)\b/gi,  // error code E13
    /\bcode\s*[:\-]?\s*([a-z]?\d{1,3}[a-z]?)\b/gi,          // code E13
    /\b(\d{1,2}[ef])\b/gi,                          // 13E format
    /\b([a-z]{1,2}\d{1,3})\b/gi,                    // LE1, HE5 format
    /\berror\s+([a-z]?\d{1,3}[a-z]?)\b/gi,         // error E13
    /\b([ef]\d{1,3})\b/gi                           // Simple E13, F05
  ]
  
  for (const pattern of errorCodePatterns) {
    const matches = problem.match(pattern)
    if (matches) {
      // Extract just the code part, removing "error code" prefix
      let code = matches[0]
        .replace(/^(error\s+code|code|error)\s*[:\-]?\s*/i, '')
        .replace(/[-\s]/g, '') // Remove hyphens and spaces
        .toUpperCase()
      
      // Ensure it starts with a letter if it's a standard error code
      if (/^\d/.test(code) && /[ef]$/i.test(code)) {
        // Convert 13E to E13
        code = code.slice(-1) + code.slice(0, -1)
      }
      
      console.log(`Detected error code: ${code} from "${problem}"`)
      return code
    }
  }
  
  return null
}

// Function to check for cached similar diagnostics before calling AI
async function checkCachedDiagnosis(
  appliance: string,
  brand: string,
  problem: string,
  errorCode: string | null
): Promise<DiagnosisResult | null> {
  try {
    // Validate inputs
    if (!appliance || !brand || !problem) {
      console.log('Invalid inputs for cache check')
      return null
    }

    console.log('Checking cache for:', { appliance, brand, problem, errorCode })

    // Call the fuzzy matching function we created in the database
    const { data, error } = await supabase
      .rpc('search_similar_diagnostics', {
        p_appliance: appliance || '',
        p_brand: brand || '',
        p_problem: problem || '',
        p_error_code: errorCode || null,
        p_threshold: 0.5  // Increased threshold to require better matches
      })

    if (error) {
      console.error('Error searching cached diagnostics:', error)
      return null
    }

    console.log(`Found ${data?.length || 0} cached matches`)

    if (!data || data.length === 0) {
      console.log('No similar cached diagnostics found')
      return null
    }

    // Get the best match (first result, already sorted by similarity)
    const bestMatch = data[0]
    
    console.log('Best match data:', JSON.stringify(bestMatch, null, 2))
    
    // Validate bestMatch has required fields
    if (!bestMatch || 
        !bestMatch.priority_level || 
        !bestMatch.estimated_cost || 
        !bestMatch.difficulty_level || 
        !bestMatch.recommended_action ||
        !bestMatch.estimated_time) {
      console.log('Cached result missing required fields:', {
        has_priority: !!bestMatch.priority_level,
        has_cost: !!bestMatch.estimated_cost,
        has_difficulty: !!bestMatch.difficulty_level,
        has_action: !!bestMatch.recommended_action,
        has_time: !!bestMatch.estimated_time
      })
      return null
    }
    
    // Only use cached result if similarity is very high AND error codes match (if present)
    // If error codes don't match, never use cache regardless of similarity
    if (errorCode && bestMatch.error_code !== errorCode) {
      console.log(`Error code mismatch: cached ${bestMatch.error_code} vs requested ${errorCode} - not using cache`)
      return null
    }
    
    // For non-error code diagnoses, require high similarity
    if (!errorCode && bestMatch.similarity_score < 0.7) {
      console.log(`Similarity score too low for non-error diagnosis: ${bestMatch.similarity_score}`)
      return null
    }

    console.log(`Found cached diagnosis with similarity: ${bestMatch.similarity_score}`)
    
    // Convert cached result to DiagnosisResult format with careful validation
    const cachedResult: DiagnosisResult = {
      errorCodeMeaning: bestMatch.error_code_meaning || undefined,
      possibleCauses: Array.isArray(bestMatch.possible_causes) && bestMatch.possible_causes.length > 0 
        ? bestMatch.possible_causes 
        : [`${brand} ${appliance} fault - ${problem}`],
      recommendations: {
        diy: Array.isArray(bestMatch.diy_solutions) && bestMatch.diy_solutions.length > 0 
          ? bestMatch.diy_solutions 
          : [
              "Check power connection and restart appliance",
              "Verify settings are correct for intended operation", 
              "Consult user manual for basic troubleshooting",
              "If problems persist after these steps, contact a professional"
            ],
        professional: Array.isArray(bestMatch.professional_services) && bestMatch.professional_services.length > 0
          ? bestMatch.professional_services
          : [
              `Full diagnostic check of ${appliance} system`,
              "Professional inspection and testing",
              "Installation of new components if required",
              "Post-repair testing and verification"
            ]
      },
      urgency: (bestMatch.priority_level || 'medium') as "low" | "medium" | "high",
      estimatedCost: bestMatch.estimated_cost || '£109-£149',
      difficulty: (bestMatch.difficulty_level || 'moderate') as "easy" | "moderate" | "difficult" | "expert",
      recommendedService: (bestMatch.recommended_action || 'professional') as "diy" | "professional" | "warranty",
      serviceReason: bestMatch.recommended_action 
        ? `Based on ${bestMatch.occurrence_count || 'previous'} similar cases, this issue typically requires ${bestMatch.recommended_action} service.`
        : "Professional assessment recommended for accurate diagnosis.",
      timeEstimate: bestMatch.estimated_time || '1-2 hours',
      skillsRequired: Array.isArray(bestMatch.skills_required) && bestMatch.skills_required.length > 0
        ? bestMatch.skills_required
        : (bestMatch.recommended_action === 'diy' 
            ? ["Basic tools", "Manual reading", "Safety awareness"]
            : ["Specialised diagnostic equipment", "Professional training", "Technical expertise"]),
      safetyWarnings: Array.isArray(bestMatch.safety_warnings) && bestMatch.safety_warnings.length > 0
        ? bestMatch.safety_warnings
        : [
            "Always disconnect power before attempting any inspection",
            "If unsure about any step, contact professional service immediately",
            "Never attempt repairs on electrical components unless qualified"
          ],
      sourceUrls: Array.isArray(bestMatch.source_urls) ? bestMatch.source_urls : undefined
    }

    return cachedResult

  } catch (error) {
    console.error('Failed to check cached diagnostics:', error)
    return null
  }
}

// Search for error code information
async function searchForErrorCode(
  brand: string,
  appliance: string,
  errorCode: string,
  serpApiKey: string
): Promise<{ searchResults: SearchResult[], relevantInfo: string }> {
  try {
    // Improved queries - more specific to avoid cross-appliance confusion
    const queries = [
      `${brand} ${appliance} error code ${errorCode} meaning -dishwasher -dryer -oven`,
      `"${brand} ${appliance}" "${errorCode}" error code what does it mean`,
      `error code ${errorCode} "${brand}" "${appliance}" fix solution`,
      `"${errorCode} error" "${brand} ${appliance}" troubleshooting`
    ]
    
    let allResults: SearchResult[] = []
    let scoredSnippets: { snippet: string, score: number }[] = []
    
    console.log(`Searching for ${brand} ${appliance} error code ${errorCode}...`)
    
    for (const query of queries) {
      // Added UK location parameter and increased results to 10
      const searchUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${serpApiKey}&num=10&gl=uk`
      
      try {
        const response = await fetch(searchUrl)
        if (response.ok) {
          const data = await response.json()
          
          // Process answer box first if available
          if (data.answer_box?.snippet) {
            scoredSnippets.push({ 
              snippet: data.answer_box.snippet, 
              score: 10 // Highest priority for answer boxes
            })
            console.log('Found answer box snippet')
          }
          
          // Process featured snippet if available
          if (data.featured_snippet?.snippet) {
            scoredSnippets.push({ 
              snippet: data.featured_snippet.snippet, 
              score: 9 // High priority for featured snippets
            })
            console.log('Found featured snippet')
          }
          
          if (data.organic_results) {
            const results = data.organic_results.map((result: any) => ({
              title: result.title,
              url: result.link,
              snippet: result.snippet || ''
            }))
            
            allResults = allResults.concat(results)
            
            // Improved relevance scoring instead of binary filtering
            results.forEach((result: SearchResult) => {
              const lowerSnippet = result.snippet.toLowerCase()
              const lowerTitle = result.title.toLowerCase()
              const lowerErrorCode = errorCode.toLowerCase()
              const lowerBrand = brand.toLowerCase()
              const lowerAppliance = appliance.toLowerCase()
              
              let score = 0
              
              // Penalize results for wrong appliance type
              const wrongAppliances = ['dishwasher', 'dryer', 'oven', 'refrigerator', 'fridge', 'freezer', 'microwave']
              const isWrongAppliance = wrongAppliances.some(wrong => 
                wrong !== lowerAppliance && (lowerSnippet.includes(wrong) || lowerTitle.includes(wrong))
              )
              
              if (isWrongAppliance) {
                score -= 5 // Heavy penalty for wrong appliance
              }
              
              // Bonus for correct appliance mention
              if (lowerSnippet.includes(lowerAppliance) || lowerTitle.includes(lowerAppliance)) {
                score += 2
              }
              
              // Score based on presence of error code
              if (lowerSnippet.includes(lowerErrorCode)) score += 3
              if (lowerTitle.includes(lowerErrorCode)) score += 2
              
              // Score based on presence of brand
              if (lowerSnippet.includes(lowerBrand)) score += 2
              if (lowerTitle.includes(lowerBrand)) score += 1
              
              // Score based on relevant keywords
              if (lowerSnippet.includes('meaning') || lowerSnippet.includes('indicates')) score += 1
              if (lowerSnippet.includes('fix') || lowerSnippet.includes('solution')) score += 1
              if (lowerSnippet.includes('error')) score += 0.5
              
              // Only include snippets with minimum relevance
              if (score >= 2 && result.snippet.length > 20) {
                scoredSnippets.push({ snippet: result.snippet, score })
                
                // Also check title for error code info
                if (lowerTitle.includes(lowerErrorCode) && lowerTitle.includes('error')) {
                  const titleInfo = `${result.title}: ${result.snippet}`
                  scoredSnippets.push({ snippet: titleInfo, score: score + 1 })
                }
              }
            })
          }
          
          // Process "People also ask" section if available
          if (data.related_questions) {
            data.related_questions.forEach((question: any) => {
              if (question.snippet && question.question.toLowerCase().includes(errorCode.toLowerCase())) {
                scoredSnippets.push({ 
                  snippet: `Q: ${question.question} A: ${question.snippet}`, 
                  score: 5 
                })
              }
            })
          }
        }
      } catch (error) {
        console.error(`Search query failed for: ${query}`, error)
      }
    }
    
    // Sort snippets by score and take the best ones
    scoredSnippets.sort((a, b) => b.score - a.score)
    const relevantSnippets = scoredSnippets.slice(0, 8).map(item => item.snippet)
    
    console.log(`Found ${allResults.length} total results, ${relevantSnippets.length} relevant snippets`)
    
    const relevantInfo = relevantSnippets.join('\n\n')
    
    return {
      searchResults: allResults.slice(0, 15), // Increased from 10 to 15
      relevantInfo
    }
  } catch (error) {
    console.error('Error searching for error code:', error)
    return { searchResults: [], relevantInfo: '' }
  }
}

// Alternative Brave search API
async function searchWithBraveAPI(
  brand: string,
  appliance: string,
  errorCode: string,
  apiKey: string
): Promise<{ searchResults: SearchResult[], relevantInfo: string }> {
  try {
    const query = `${brand} ${appliance} error code ${errorCode} meaning troubleshooting`
    const url = new URL('https://api.search.brave.com/res/v1/web/search')
    url.searchParams.append('q', query)
    url.searchParams.append('count', '20')
    url.searchParams.append('country', 'gb') // UK-specific results
    
    const response = await fetch(url.toString(), {
      headers: {
        'X-Subscription-Token': apiKey,
        'Accept': 'application/json'
      },
      method: 'GET'
    })
    
    if (!response.ok) {
      throw new Error(`Brave search failed: ${response.status}`)
    }
    
    const data = await response.json()
    const searchResults = data.web?.results?.map((result: any) => ({
      title: result.title,
      url: result.url,
      snippet: result.description || ''
    })) || []
    
    // Use same scoring system as SerpAPI function
    let scoredSnippets: { snippet: string, score: number }[] = []
    
    searchResults.forEach((result: SearchResult) => {
      const lowerSnippet = result.snippet.toLowerCase()
      const lowerTitle = result.title.toLowerCase()
      const lowerErrorCode = errorCode.toLowerCase()
      const lowerBrand = brand.toLowerCase()
      const lowerAppliance = appliance.toLowerCase()
      
      let score = 0
      
      // Penalize results for wrong appliance type
      const wrongAppliances = ['dishwasher', 'dryer', 'oven', 'refrigerator', 'fridge', 'freezer', 'microwave']
      const isWrongAppliance = wrongAppliances.some(wrong => 
        wrong !== lowerAppliance && (lowerSnippet.includes(wrong) || lowerTitle.includes(wrong))
      )
      
      if (isWrongAppliance) {
        score -= 5 // Heavy penalty for wrong appliance
      }
      
      // Bonus for correct appliance mention
      if (lowerSnippet.includes(lowerAppliance) || lowerTitle.includes(lowerAppliance)) {
        score += 2
      }
      
      // Score based on presence of error code
      if (lowerSnippet.includes(lowerErrorCode)) score += 3
      if (lowerTitle.includes(lowerErrorCode)) score += 2
      
      // Score based on presence of brand
      if (lowerSnippet.includes(lowerBrand)) score += 2
      if (lowerTitle.includes(lowerBrand)) score += 1
      
      // Score based on relevant keywords
      if (lowerSnippet.includes('meaning') || lowerSnippet.includes('indicates')) score += 1
      if (lowerSnippet.includes('fix') || lowerSnippet.includes('solution')) score += 1
      if (lowerSnippet.includes('error')) score += 0.5
      
      // Only include snippets with minimum relevance
      if (score >= 2 && result.snippet.length > 20) {
        scoredSnippets.push({ snippet: result.snippet, score })
        
        // Also check title for error code info
        if (lowerTitle.includes(lowerErrorCode) && lowerTitle.includes('error')) {
          const titleInfo = `${result.title}: ${result.snippet}`
          scoredSnippets.push({ snippet: titleInfo, score: score + 1 })
        }
      }
    })
    
    // Sort snippets by score and take the best ones
    scoredSnippets.sort((a, b) => b.score - a.score)
    const relevantSnippets = scoredSnippets.slice(0, 8).map(item => item.snippet)
    
    console.log(`Brave: Found ${searchResults.length} results, ${relevantSnippets.length} relevant snippets`)
    
    const relevantInfo = relevantSnippets.join('\n\n')
    
    return { searchResults: searchResults.slice(0, 15), relevantInfo }
  } catch (error) {
    console.error('Brave search error:', error)
    return { searchResults: [], relevantInfo: '' }
  }
}

// AI diagnosis with search results
async function diagnoseWithAI(
  appliance: string,
  brand: string, 
  problem: string,
  errorCode: string | null,
  searchInfo: string,
  searchUrls: string[],
  apiKey: string
): Promise<DiagnosisResult | null> {
  try {
    const errorCodeText = errorCode ? ` showing error code ${errorCode}` : ''
    
    const prompt = `You are a professional appliance repair engineer in the UK. A customer has a ${brand} ${appliance}${errorCodeText} with this problem: "${problem}"

${errorCode && searchInfo ? `
SEARCH RESULTS FOR ${brand} ${errorCode}:
${searchInfo}

Based on the search results above, provide accurate information about this specific error code.
` : ''}

Please provide a comprehensive diagnosis using this EXACT format. Use BRITISH ENGLISH spelling and terminology throughout (e.g. programme not program, colour not color, authorised not authorized):

**ERROR CODE MEANING:** ${errorCode ? `[Based on the search results, explain what error code ${errorCode} means on ${brand} ${appliance} models]` : 'N/A - No error code present'}

**POSSIBLE CAUSES:**
1. [Most likely cause based on search results and expertise]
2. [Second most likely cause]
3. [Third possible cause]
4. [Fourth possible cause if applicable]
5. [Fifth possible cause if applicable]

**DIY RECOMMENDATIONS:**
• [Specific step customer can try - be detailed, use British terminology]
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

**SERVICE REASON:** [Detailed explanation of why DIY or professional service is recommended]

Be specific to ${brand} ${appliance} and base your response on the search results provided when available. Use British English throughout.`

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "Repair Help AI Diagnosis"
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
    
    const result = parseAIResponse(aiResponse, appliance, brand, problem, errorCode)
    
    if (searchUrls.length > 0) {
      result.sourceUrls = searchUrls.slice(0, 3)
    }
    
    return result

  } catch (error) {
    console.error('Error in AI diagnosis:', error)
    return null
  }
}

// Email sending has been moved to client-side (diagnostic-form.tsx)
// This avoids issues with server actions making HTTP requests in Vercel deployments
// The /api/send-diagnostic-report endpoint is called directly from the client after diagnosis

// Main diagnosis function
export async function diagnoseProblem(
  appliance: string, 
  brand: string, 
  problem: string, 
  email: string
): Promise<DiagnosisResult> {
  try {
    // Input validation
    const emailValidation = validateEmail(email)
    if (!emailValidation.isValid) {
      console.error('Email validation failed:', emailValidation.errors)
      throw new Error('Invalid email address')
    }
    
    const applianceValidation = validateTextField(appliance, 'Appliance', 2, 100)
    if (!applianceValidation.isValid) {
      console.error('Appliance validation failed:', applianceValidation.errors)
      throw new Error('Invalid appliance type')
    }
    
    const brandValidation = validateTextField(brand, 'Brand', 2, 100)
    if (!brandValidation.isValid) {
      console.error('Brand validation failed:', brandValidation.errors)
      throw new Error('Invalid brand name')
    }
    
    const problemValidation = validateTextField(problem, 'Problem', 10, 500)
    if (!problemValidation.isValid) {
      console.error('Problem validation failed:', problemValidation.errors)
      throw new Error('Invalid problem description')
    }
    
    // Sanitize inputs
    const sanitizedAppliance = sanitizeForServer(appliance, 100)
    const sanitizedBrand = sanitizeForServer(brand, 100)
    const sanitizedProblem = sanitizeForServer(problem, 500)
    const sanitizedEmail = email.trim().toLowerCase()
    
    // Check rate limit
    if (!checkRateLimit(sanitizedEmail)) {
      console.error(`Rate limit exceeded for email: ${sanitizedEmail}`)
      throw new Error('Too many requests. Please try again in an hour.')
    }
    
    const openRouterApiKey = process.env.OPENROUTER_API_KEY
    const searchApiKey = process.env.SERP_API_KEY || process.env.BRAVE_SEARCH_API_KEY

    // Normalize appliance type (remove "spares", "parts", etc.)
    const normalizedAppliance = sanitizedAppliance.toLowerCase()
      .replace(/\s*(spares?|parts?|accessories)\s*/gi, '')
      .trim()

    // Detect error code if present
    const detectedErrorCode = detectErrorCode(sanitizedProblem)
    console.log(`Analysing: ${sanitizedBrand} ${normalizedAppliance} - ${sanitizedProblem}${detectedErrorCode ? ` (Error: ${detectedErrorCode})` : ''}`)

    // NEW: Check for cached similar diagnosis first
    const cachedDiagnosis = await checkCachedDiagnosis(normalizedAppliance, sanitizedBrand, sanitizedProblem, detectedErrorCode)

    if (cachedDiagnosis) {
      console.log('✨ Using cached diagnosis result - faster and cheaper!')
      console.log('Cached diagnosis data:', JSON.stringify(cachedDiagnosis, null, 2))
      // Save this as a new entry but mark it as cached
      await saveDiagnosticToDatabase(sanitizedAppliance, sanitizedBrand, sanitizedProblem, sanitizedEmail, cachedDiagnosis, detectedErrorCode, true)
      
      // Email sending is now handled client-side after diagnosis is displayed
      // This avoids issues with server actions in Vercel
      
      return cachedDiagnosis
    }

    // Continue with normal AI diagnosis if no cache hit
    console.log('No cache match - proceeding with AI diagnosis')
    
    if (!openRouterApiKey) {
      console.error('OpenRouter API key not found')
      const fallbackResult = getEmergencyFallback(sanitizedAppliance, sanitizedBrand, sanitizedProblem)
      await saveDiagnosticToDatabase(sanitizedAppliance, sanitizedBrand, sanitizedProblem, sanitizedEmail, fallbackResult, detectedErrorCode, false)
      return fallbackResult
    }

    let searchInfo = ''
    let searchUrls: string[] = []

    if (detectedErrorCode && searchApiKey) {
      console.log(`Searching for ${sanitizedBrand} ${detectedErrorCode} information...`)
      
      let searchResults
      if (process.env.SERP_API_KEY) {
        searchResults = await searchForErrorCode(sanitizedBrand, normalizedAppliance, detectedErrorCode, process.env.SERP_API_KEY)
      } else if (process.env.BRAVE_SEARCH_API_KEY) {
        searchResults = await searchWithBraveAPI(sanitizedBrand, normalizedAppliance, detectedErrorCode, process.env.BRAVE_SEARCH_API_KEY)
      }
      
      if (searchResults) {
        searchInfo = searchResults.relevantInfo
        searchUrls = searchResults.searchResults.map(r => r.url)
        console.log(`Found ${searchResults.searchResults.length} search results`)
        
        // Enhanced logging for debugging
        if (searchInfo) {
          console.log(`Relevant search info length: ${searchInfo.length} characters`)
          console.log('First 200 chars of search info:', searchInfo.substring(0, 200) + '...')
        } else {
          console.log('WARNING: No relevant search info found for error code')
        }
      }
    }

    const aiResult = await diagnoseWithAI(
      sanitizedAppliance,
      sanitizedBrand,
      sanitizedProblem,
      detectedErrorCode,
      searchInfo,
      searchUrls,
      openRouterApiKey
    )

    if (aiResult) {
      console.log('AI diagnosis successful')
      if (searchUrls.length > 0 && !aiResult.sourceUrls) {
        aiResult.sourceUrls = searchUrls.slice(0, 3)
      }
      await saveDiagnosticToDatabase(sanitizedAppliance, sanitizedBrand, sanitizedProblem, sanitizedEmail, aiResult, detectedErrorCode, false)
      
      // Email sending is now handled client-side in diagnostic-form.tsx
      
      return aiResult
    }

    console.log('AI diagnosis failed, using emergency fallback')
    const fallbackResult = getEmergencyFallback(sanitizedAppliance, sanitizedBrand, sanitizedProblem)
    await saveDiagnosticToDatabase(sanitizedAppliance, sanitizedBrand, sanitizedProblem, sanitizedEmail, fallbackResult, detectedErrorCode, false)
    
    // Email sending is now handled client-side
    
    return fallbackResult

  } catch (error) {
    console.error("Diagnosis error:", error)
    // Use original inputs for fallback, sanitize them first
    const fallbackAppliance = sanitizeForServer(appliance || '', 100)
    const fallbackBrand = sanitizeForServer(brand || '', 100)
    const fallbackProblem = sanitizeForServer(problem || '', 500)
    const fallbackEmail = (email || '').trim().toLowerCase()
    
    const fallbackResult = getEmergencyFallback(fallbackAppliance, fallbackBrand, fallbackProblem)
    await saveDiagnosticToDatabase(fallbackAppliance, fallbackBrand, fallbackProblem, fallbackEmail, fallbackResult, null, false)
    
    // Email sending is now handled client-side
    
    return fallbackResult
  }
}

// Parse AI response
function parseAIResponse(
  aiResponse: string, 
  appliance: string, 
  brand: string, 
  problem: string,
  errorCode: string | null
): DiagnosisResult {
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

  let errorCodeMeaning = undefined
  if (sections.errorCodeMeaning && !sections.errorCodeMeaning.includes('N/A')) {
    errorCodeMeaning = sections.errorCodeMeaning
  }

  const possibleCauses = sections.causes.length > 0 ? sections.causes : [
    `${brand} ${appliance}${errorCode ? ` error ${errorCode}` : ''} - ${problem}`
  ]

  const diyRecommendations = sections.diyRecs.length > 0 ? sections.diyRecs : [
    "Check power connection and restart appliance",
    "Verify settings are correct for intended operation",
    "Consult user manual for basic troubleshooting",
    "Contact professional if basic steps don't resolve issue"
  ]

  const professionalRecommendations = sections.professionalRecs.length > 0 ? sections.professionalRecs : [
    `Professional diagnosis of ${brand} ${appliance}`,
    "Specialised diagnostic equipment and tools",
    "Expert repair with genuine replacement parts",
    "Complete testing and warranty on repair work",
    "Follow-up service and support",
    "Certified engineer assessment"
  ]

  const serviceTypeText = sections.serviceType.toLowerCase()
  let recommendedService: "diy" | "professional" | "warranty" = 'professional'
  
  if (serviceTypeText.includes('diy')) {
    recommendedService = 'diy'
  } else if (serviceTypeText.includes('warranty')) {
    recommendedService = 'warranty'
  }

  const difficultyText = sections.difficulty.toLowerCase()
  let difficulty: "easy" | "moderate" | "difficult" | "expert" = 'moderate'
  
  if (difficultyText.includes('easy')) difficulty = 'easy'
  else if (difficultyText.includes('moderate')) difficulty = 'moderate'
  else if (difficultyText.includes('difficult')) difficulty = 'difficult'
  else if (difficultyText.includes('expert')) difficulty = 'expert'

  const urgencyText = sections.urgency.toLowerCase()
  let urgency: "low" | "medium" | "high" = 'medium'
  
  if (urgencyText.includes('low')) urgency = 'low'
  else if (urgencyText.includes('high')) urgency = 'high'

  let timeEstimate = sections.timeEstimate || "1-2 hours"
  if (recommendedService === 'diy' && !timeEstimate.includes('minutes')) {
    timeEstimate = "30-60 minutes"
  }

  let estimatedCost = sections.costEstimate || "£109-£149"
  if (recommendedService === 'diy') {
    estimatedCost = extractDIYCost(estimatedCost) || "£0-£50"
  } else {
    estimatedCost = capProfessionalCost(estimatedCost)
  }

  const skillsText = sections.skillsNeeded
  let skillsRequired: string[] = []
  
  if (skillsText) {
    skillsRequired = skillsText.split(',').map(s => s.trim()).filter(s => s.length > 0)
  }
  
  if (skillsRequired.length === 0) {
    skillsRequired = recommendedService === 'diy' 
      ? ["Basic tools", "Manual reading", "Safety awareness"]
      : ["Specialised diagnostic equipment", "Professional training", "Technical expertise"]
  }

  const safetyWarnings = sections.safetyWarnings.length > 0 ? sections.safetyWarnings : [
    "Always disconnect power before attempting any inspection",
    "If unsure about any step, contact professional service immediately"
  ]

  let serviceReason = sections.serviceReason
  if (!serviceReason || serviceReason.length < 20) {
    serviceReason = recommendedService === 'diy'
      ? `Basic troubleshooting steps can be safely attempted for this ${brand} ${appliance} issue before requiring professional service.`
      : `This ${brand} ${appliance} issue requires professional diagnosis with specialised equipment for safe and accurate repair.`
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

// Extract bulleted/numbered sections
function extractSection(text: string, sectionNames: string[]): string[] {
  for (const sectionName of sectionNames) {
    const regex = new RegExp(`\\*\\*${sectionName}[:\\*]*\\*\\*([\\s\\S]*?)(?=\\*\\*[A-Z]|$)`, 'i')
    const match = text.match(regex)
    
    if (match) {
      const sectionText = match[1].trim()
      const items: string[] = []
      
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

// Extract simple field values
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

// Extract DIY cost
function extractDIYCost(costText: string): string | null {
  if (costText.includes('DIY') || costText.includes('£0')) {
    const diyMatch = costText.match(/DIY[^:]*:?\s*(£[\d\-£\s]+)/i)
    if (diyMatch) return diyMatch[1].trim()
    
    const freeMatch = costText.match(/(£0[^£]*£\d+)/i)
    if (freeMatch) return freeMatch[1].trim()
  }
  
  return null
}

// Cap professional costs
function capProfessionalCost(costText: string): string {
  if (!costText.includes('£')) {
    return '£109-£149'
  }
  
  const costMatch = costText.match(/£(\d+)\s*[-–]\s*£(\d+)/)
  if (costMatch) {
    const minCost = Math.max(parseInt(costMatch[1]), 80)
    const maxCost = Math.min(parseInt(costMatch[2]), 149)
    return `£${minCost}-£${maxCost}`
  }
  
  const singleMatch = costText.match(/£(\d+)/)
  if (singleMatch) {
    const cost = Math.min(parseInt(singleMatch[1]), 149)
    return cost < 100 ? `£${cost}-£149` : `£109-£${cost}`
  }
  
  return '£109-£149'
}

// Emergency fallback
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
        "Certified engineer assessment"
      ]
    },
    urgency: isSafetyIssue ? "high" : "medium",
    estimatedCost: "£109-£149",
    difficulty: "expert",
    recommendedService: "professional",
    serviceReason: "Diagnostic system unavailable - professional inspection required for safety and accurate diagnosis.",
    skillsRequired: ["Professional certification", "Specialised equipment"],
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

// Save diagnostic to database
async function saveDiagnosticToDatabase(
  appliance: string,
  brand: string, 
  problem: string, 
  email: string, 
  diagnosis: DiagnosisResult,
  errorCode?: string | null,
  wasCached: boolean = false  // ADD THIS PARAMETER
): Promise<void> {
  try {
    // Validation: Don't save error code content for non-error problems
    let validatedDiagnosis = { ...diagnosis }
    
    if (!errorCode) {
      // Remove any error code references from non-error diagnoses
      validatedDiagnosis.errorCodeMeaning = undefined
      
      // Filter out any error code mentions from arrays
      validatedDiagnosis.possibleCauses = diagnosis.possibleCauses.filter(
        cause => !cause.toLowerCase().includes('error code') && !cause.match(/\b[ef]\d{1,3}\b/i)
      )
      
      validatedDiagnosis.recommendations.diy = diagnosis.recommendations.diy.filter(
        step => !step.toLowerCase().includes('error code')
      )
      
      validatedDiagnosis.recommendations.professional = diagnosis.recommendations.professional.filter(
        service => !service.toLowerCase().includes('error code')
      )
    }
    
    // Ensure arrays are not empty after filtering
    if (validatedDiagnosis.possibleCauses.length === 0) {
      validatedDiagnosis.possibleCauses = [`${brand} ${appliance} - ${problem}`]
    }
    
    if (validatedDiagnosis.recommendations.diy.length === 0) {
      validatedDiagnosis.recommendations.diy = [
        "Check power connection and basic settings",
        "Consult user manual for troubleshooting",
        "Contact professional if issue persists"
      ]
    }
    
    if (validatedDiagnosis.recommendations.professional.length === 0) {
      validatedDiagnosis.recommendations.professional = [
        `Professional diagnosis of ${appliance}`,
        "Complete system inspection and testing",
        "Repair or replacement of faulty components"
      ]
    }

    const { error } = await supabase
      .from('diagnostics')
      .insert({
        email,
        appliance_type: appliance,
        appliance_brand: brand || null,
        problem_description: problem,
        error_code: errorCode || null,
        error_code_meaning: validatedDiagnosis.errorCodeMeaning || null,
        estimated_time: validatedDiagnosis.timeEstimate,
        estimated_cost: validatedDiagnosis.estimatedCost,
        difficulty_level: validatedDiagnosis.difficulty,
        priority_level: validatedDiagnosis.urgency,
        possible_causes: validatedDiagnosis.possibleCauses,
        diy_solutions: validatedDiagnosis.recommendations.diy,
        professional_services: validatedDiagnosis.recommendations.professional,
        recommended_action: validatedDiagnosis.recommendedService,
        source_urls: validatedDiagnosis.sourceUrls || null,
        was_cached: wasCached,  // ADD THIS LINE
        diagnosis_confidence: wasCached ? 0.9 : 1.0,
        converted_to_booking: false,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Database save error:', error)
    } else {
      console.log(`Diagnostic saved to database ${wasCached ? '(from cache)' : '(from AI)'} - validated: ${!errorCode ? 'cleaned' : 'with error code'}`)
      
      // Email sending is now handled client-side in diagnostic-form.tsx
      // This avoids issues with server actions making HTTP requests in Vercel
      console.log('Diagnostic saved. Email will be sent from client-side.')
    }
  } catch (error) {
    console.error('Failed to save diagnostic to database:', error)
  }
}

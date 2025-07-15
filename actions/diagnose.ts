//force update
"use server"

import { supabase } from '@/lib/supabase'
import sgMail from '@sendgrid/mail'

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

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

// Send diagnostic report email helper function
async function sendDiagnosticReportEmail(
  email: string,
  appliance: string,
  brand: string,
  problem: string,
  diagnosis: DiagnosisResult,
  errorCode: string | null
): Promise<void> {
  try {
    console.log('Sending diagnostic report email to:', email)
    
    // Format urgency for display
    const formatUrgency = (urgency: string) => {
      const urgencyMap: { [key: string]: { text: string; color: string } } = {
        'low': { text: 'Low Priority', color: '#10b981' },
        'medium': { text: 'Medium Priority', color: '#f59e0b' },
        'high': { text: 'High Priority - Urgent', color: '#ef4444' }
      }
      return urgencyMap[urgency] || urgencyMap['medium']
    }

    // Format difficulty for display
    const formatDifficulty = (difficulty: string) => {
      const difficultyMap: { [key: string]: { text: string; color: string } } = {
        'easy': { text: 'Easy - DIY Possible', color: '#10b981' },
        'moderate': { text: 'Moderate - Some Skills Required', color: '#3b82f6' },
        'difficult': { text: 'Difficult - Professional Recommended', color: '#f59e0b' },
        'expert': { text: 'Expert Only - Professional Required', color: '#ef4444' }
      }
      return difficultyMap[difficulty] || difficultyMap['moderate']
    }

    // Format recommended service
    const formatRecommendedService = (service: string) => {
      const serviceMap: { [key: string]: string } = {
        'diy': 'DIY Repair Possible',
        'professional': 'Professional Service Recommended',
        'warranty': 'Check Warranty Coverage'
      }
      return serviceMap[service] || 'Professional Service Recommended'
    }

    const urgencyInfo = formatUrgency(diagnosis.urgency)
    const difficultyInfo = formatDifficulty(diagnosis.difficulty)

    // Send diagnostic report email directly using SendGrid
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject: `Diagnostic Report - ${brand} ${appliance} - Repair Help`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Repair Help - Diagnostic Report</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4;">
                <tr>
                    <td align="center" style="padding: 20px;">
                        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; max-width: 600px;">
                            
                            <!-- Header -->
                            <tr>
                                <td style="background-color: #2563eb; padding: 30px; text-align: center;">
                                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Repair Help</h1>
                                    <p style="color: #bfdbfe; margin: 5px 0 0 0; font-size: 14px;">AI-Powered Diagnostic Report</p>
                                </td>
                            </tr>
                            
                            <!-- Main Content -->
                            <tr>
                                <td style="padding: 40px 30px;">
                                    <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px; text-align: center;">Your Diagnostic Report</h2>
                                    
                                    <!-- Appliance Info -->
                                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                                        <tr>
                                            <td style="padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                                                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Appliance Details</h3>
                                                <p style="color: #4b5563; margin: 0 0 5px 0;"><strong>Appliance:</strong> ${brand} ${appliance}</p>
                                                <p style="color: #4b5563; margin: 0 0 5px 0;"><strong>Problem Description:</strong> ${problem}</p>
                                                ${errorCode ? `<p style="color: #4b5563; margin: 0;"><strong>Error Code:</strong> ${errorCode}</p>` : ''}
                                            </td>
                                        </tr>
                                    </table>

                                    ${diagnosis.errorCodeMeaning ? `
                                    <!-- Error Code Meaning -->
                                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                                        <tr>
                                            <td style="padding: 20px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                                                <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">Error Code ${errorCode} Meaning</h3>
                                                <p style="color: #92400e; margin: 0; line-height: 1.6;">${diagnosis.errorCodeMeaning}</p>
                                            </td>
                                        </tr>
                                    </table>
                                    ` : ''}

                                    <!-- Quick Assessment -->
                                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                                        <tr>
                                            <td>
                                                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Quick Assessment</h3>
                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                    <tr>
                                                        <td style="padding: 10px; background-color: #f9fafb; border-radius: 6px; width: 48%;">
                                                            <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 12px;">URGENCY</p>
                                                            <p style="color: ${urgencyInfo.color}; margin: 0; font-weight: bold;">${urgencyInfo.text}</p>
                                                        </td>
                                                        <td style="width: 4%;"></td>
                                                        <td style="padding: 10px; background-color: #f9fafb; border-radius: 6px; width: 48%;">
                                                            <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 12px;">DIFFICULTY</p>
                                                            <p style="color: ${difficultyInfo.color}; margin: 0; font-weight: bold;">${difficultyInfo.text}</p>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding-top: 10px;"></td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 10px; background-color: #f9fafb; border-radius: 6px; width: 48%;">
                                                            <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 12px;">ESTIMATED COST</p>
                                                            <p style="color: #1f2937; margin: 0; font-weight: bold; font-size: 18px;">${diagnosis.estimatedCost}</p>
                                                        </td>
                                                        <td style="width: 4%;"></td>
                                                        <td style="padding: 10px; background-color: #f9fafb; border-radius: 6px; width: 48%;">
                                                            <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 12px;">TIME ESTIMATE</p>
                                                            <p style="color: #1f2937; margin: 0; font-weight: bold;">${diagnosis.timeEstimate}</p>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>

                                    <!-- Recommendation -->
                                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                                        <tr>
                                            <td style="padding: 20px; background-color: #dbeafe; border-radius: 8px; border-left: 4px solid #2563eb;">
                                                <h3 style="color: #1e40af; margin: 0 0 10px 0; font-size: 16px;">Our Recommendation</h3>
                                                <p style="color: #1e40af; margin: 0 0 10px 0; font-weight: bold;">${formatRecommendedService(diagnosis.recommendedService)}</p>
                                                <p style="color: #1e40af; margin: 0; line-height: 1.6; font-size: 14px;">${diagnosis.serviceReason}</p>
                                            </td>
                                        </tr>
                                    </table>

                                    <!-- Possible Causes -->
                                    <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Possible Causes</h3>
                                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                                        <tr>
                                            <td style="padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                                                <ul style="color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.8;">
                                                    ${diagnosis.possibleCauses.map(cause => `<li style="margin-bottom: 8px;">${cause}</li>`).join('')}
                                                </ul>
                                            </td>
                                        </tr>
                                    </table>

                                    ${diagnosis.recommendations.diy.length > 0 ? `
                                    <!-- DIY Recommendations -->
                                    <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">DIY Troubleshooting Steps</h3>
                                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                                        <tr>
                                            <td style="padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                                                <ol style="color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.8;">
                                                    ${diagnosis.recommendations.diy.map(step => `<li style="margin-bottom: 8px;">${step}</li>`).join('')}
                                                </ol>
                                            </td>
                                        </tr>
                                    </table>
                                    ` : ''}

                                    <!-- Professional Services -->
                                    <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Professional Services Included</h3>
                                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                                        <tr>
                                            <td style="padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                                                <ul style="color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.8;">
                                                    ${diagnosis.recommendations.professional.map(service => `<li style="margin-bottom: 8px;">${service}</li>`).join('')}
                                                </ul>
                                            </td>
                                        </tr>
                                    </table>

                                    ${diagnosis.safetyWarnings && diagnosis.safetyWarnings.length > 0 ? `
                                    <!-- Safety Warnings -->
                                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                                        <tr>
                                            <td style="padding: 20px; background-color: #fee2e2; border-radius: 8px; border-left: 4px solid #ef4444;">
                                                <h3 style="color: #991b1b; margin: 0 0 10px 0; font-size: 16px;">⚠️ Important Safety Information</h3>
                                                <ul style="color: #991b1b; margin: 0; padding-left: 20px; line-height: 1.6;">
                                                    ${diagnosis.safetyWarnings.map(warning => `<li style="margin-bottom: 5px;">${warning}</li>`).join('')}
                                                </ul>
                                            </td>
                                        </tr>
                                    </table>
                                    ` : ''}

                                    <!-- Call to Action -->
                                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                        <tr>
                                            <td align="center">
                                                <h3 style="color: #1f2937; margin: 0 0 20px 0; font-size: 18px;">Ready to Fix Your ${appliance}?</h3>
                                                <table cellpadding="0" cellspacing="0">
                                                    <tr>
                                                        <td style="padding-right: 10px;">
                                                            <a href="https://repairs.ransomspares.co.uk/book" style="display: inline-block; padding: 14px 28px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">Book an Engineer</a>
                                                        </td>
                                                        <td style="padding-left: 10px;">
                                                            <a href="https://www.ransomspares.co.uk/search/?q=${encodeURIComponent(brand + ' ' + appliance)}" style="display: inline-block; padding: 14px 28px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">Find Spare Parts</a>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>

                                    ${diagnosis.skillsRequired && diagnosis.skillsRequired.length > 0 ? `
                                    <!-- Skills Required -->
                                    <p style="color: #6b7280; margin: 20px 0 0 0; font-size: 12px; text-align: center;">
                                        <strong>Skills Required:</strong> ${diagnosis.skillsRequired.join(', ')}
                                    </p>
                                    ` : ''}

                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                                    <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 14px; font-weight: bold;">Repair Help</p>
                                    <p style="color: #9ca3af; margin: 0 0 15px 0; font-size: 12px;">AI-Powered Appliance Diagnostics</p>
                                    <p style="color: #9ca3af; margin: 0 0 15px 0; font-size: 11px;">Part of the Ransom Spares Group, Unit 3 Flushing Meadow, Yeovil, BA21 5DL</p>
                                    <p style="color: #9ca3af; margin: 0; font-size: 11px;">
                                        <a href="#" style="color: #6b7280; text-decoration: none;">Privacy Policy</a> | 
                                        <a href="#" style="color: #6b7280; text-decoration: none;">Terms of Service</a> | 
                                        <a href="#" style="color: #6b7280; text-decoration: none;">Unsubscribe</a>
                                    </p>
                                </td>
                            </tr>
                            
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
      `,
      text: `
Repair Help - Diagnostic Report

Your Diagnostic Report for ${brand} ${appliance}

Problem Description: ${problem}
${errorCode ? `Error Code: ${errorCode}` : ''}

${diagnosis.errorCodeMeaning ? `ERROR CODE ${errorCode} MEANING:\n${diagnosis.errorCodeMeaning}\n\n` : ''}

QUICK ASSESSMENT:
• Urgency: ${urgencyInfo.text}
• Difficulty: ${difficultyInfo.text}
• Estimated Cost: ${diagnosis.estimatedCost}
• Time Estimate: ${diagnosis.timeEstimate}

OUR RECOMMENDATION:
${formatRecommendedService(diagnosis.recommendedService)}
${diagnosis.serviceReason}

POSSIBLE CAUSES:
${diagnosis.possibleCauses.map((cause, i) => `${i + 1}. ${cause}`).join('\n')}

${diagnosis.recommendations.diy.length > 0 ? `
DIY TROUBLESHOOTING STEPS:
${diagnosis.recommendations.diy.map((step, i) => `${i + 1}. ${step}`).join('\n')}
` : ''}

PROFESSIONAL SERVICES INCLUDED:
${diagnosis.recommendations.professional.map((service, i) => `• ${service}`).join('\n')}

${diagnosis.safetyWarnings && diagnosis.safetyWarnings.length > 0 ? `
⚠️ IMPORTANT SAFETY INFORMATION:
${diagnosis.safetyWarnings.map(warning => `• ${warning}`).join('\n')}
` : ''}

${diagnosis.skillsRequired && diagnosis.skillsRequired.length > 0 ? `
Skills Required: ${diagnosis.skillsRequired.join(', ')}
` : ''}

Ready to fix your ${appliance}?

Book an Engineer: https://repairs.ransomspares.co.uk/book
Find Spare Parts: https://www.ransomspares.co.uk/search/?q=${encodeURIComponent(brand + ' ' + appliance)}

---
Repair Help - AI-Powered Appliance Diagnostics
Part of the Ransom Spares Group, Unit 3 Flushing Meadow, Yeovil, BA21 5DL

To unsubscribe from these emails, click here.
      `
    }

    await sgMail.send(msg)
    console.log('Diagnostic report email sent successfully to:', email)
    
  } catch (error) {
    console.error('Error sending diagnostic report email:', error)
    // Don't throw - we don't want email failures to break the diagnosis flow
  }
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
    const searchApiKey = process.env.SERP_API_KEY || process.env.BRAVE_SEARCH_API_KEY

    // Normalize appliance type (remove "spares", "parts", etc.)
    const normalizedAppliance = appliance.toLowerCase()
      .replace(/\s*(spares?|parts?|accessories)\s*/gi, '')
      .trim()

    // Detect error code if present
    const detectedErrorCode = detectErrorCode(problem)
    console.log(`Analysing: ${brand} ${normalizedAppliance} - ${problem}${detectedErrorCode ? ` (Error: ${detectedErrorCode})` : ''}`)

    // NEW: Check for cached similar diagnosis first
    const cachedDiagnosis = await checkCachedDiagnosis(normalizedAppliance, brand, problem, detectedErrorCode)

    if (cachedDiagnosis) {
      console.log('✨ Using cached diagnosis result - faster and cheaper!')
      console.log('Cached diagnosis data:', JSON.stringify(cachedDiagnosis, null, 2))
      // Save this as a new entry but mark it as cached
      await saveDiagnosticToDatabase(appliance, brand, problem, email, cachedDiagnosis, detectedErrorCode, true)
      
      // Send diagnostic report email asynchronously
      sendDiagnosticReportEmail(email, appliance, brand, problem, cachedDiagnosis, detectedErrorCode)
        .catch(error => console.error('Failed to send diagnostic report email:', error))
      
      return cachedDiagnosis
    }

    // Continue with normal AI diagnosis if no cache hit
    console.log('No cache match - proceeding with AI diagnosis')
    
    if (!openRouterApiKey) {
      console.error('OpenRouter API key not found')
      const fallbackResult = getEmergencyFallback(appliance, brand, problem)
      await saveDiagnosticToDatabase(appliance, brand, problem, email, fallbackResult, detectedErrorCode, false)
      return fallbackResult
    }

    let searchInfo = ''
    let searchUrls: string[] = []

    if (detectedErrorCode && searchApiKey) {
      console.log(`Searching for ${brand} ${detectedErrorCode} information...`)
      
      let searchResults
      if (process.env.SERP_API_KEY) {
        searchResults = await searchForErrorCode(brand, normalizedAppliance, detectedErrorCode, process.env.SERP_API_KEY)
      } else if (process.env.BRAVE_SEARCH_API_KEY) {
        searchResults = await searchWithBraveAPI(brand, normalizedAppliance, detectedErrorCode, process.env.BRAVE_SEARCH_API_KEY)
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
      appliance,
      brand,
      problem,
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
      await saveDiagnosticToDatabase(appliance, brand, problem, email, aiResult, detectedErrorCode, false)
      
      // Send diagnostic report email asynchronously (don't block the response)
      sendDiagnosticReportEmail(email, appliance, brand, problem, aiResult, detectedErrorCode)
        .catch(error => console.error('Failed to send diagnostic report email:', error))
      
      return aiResult
    }

    console.log('AI diagnosis failed, using emergency fallback')
    const fallbackResult = getEmergencyFallback(appliance, brand, problem)
    await saveDiagnosticToDatabase(appliance, brand, problem, email, fallbackResult, detectedErrorCode, false)
    
    // Send diagnostic report email even for fallback results
    sendDiagnosticReportEmail(email, appliance, brand, problem, fallbackResult, detectedErrorCode)
      .catch(error => console.error('Failed to send diagnostic report email:', error))
    
    return fallbackResult

  } catch (error) {
    console.error("Diagnosis error:", error)
    const fallbackResult = getEmergencyFallback(appliance, brand, problem)
    await saveDiagnosticToDatabase(appliance, brand, problem, email, fallbackResult, null, false)
    
    // Send diagnostic report email even for error cases
    sendDiagnosticReportEmail(email, appliance, brand, problem, fallbackResult, null)
      .catch(error => console.error('Failed to send diagnostic report email:', error))
    
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
      
      // Send diagnostic report email asynchronously
      try {
        // In server actions, we need to construct the URL properly
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}`
          : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          
        const emailResponse = await fetch(`${baseUrl}/api/send-diagnostic-report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            appliance,
            brand,
            problem,
            diagnosis: validatedDiagnosis,
            errorCode
          })
        })
        
        if (emailResponse.ok) {
          console.log('Diagnostic report email sent successfully to:', email)
        } else {
          const errorData = await emailResponse.json()
          console.error('Failed to send diagnostic report email:', errorData.error)
        }
      } catch (emailError) {
        console.error('Error sending diagnostic report email:', emailError)
        // Don't throw - we don't want email failures to break the diagnosis flow
      }
    }
  } catch (error) {
    console.error('Failed to save diagnostic to database:', error)
  }
}

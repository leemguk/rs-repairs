// Updated saveDiagnosticToDatabase function with enhanced data for fuzzy matching
async function saveDiagnosticToDatabase(
  appliance: string,
  brand: string, 
  problem: string, 
  email: string, 
  diagnosis: DiagnosisResult,
  errorCode?: string | null,
  searchUrls?: string[]
): Promise<void> {
  try {
    // Extract keywords for fuzzy matching (this will also be done by DB trigger)
    const commonWords = ['the', 'is', 'not', 'and', 'or', 'but', 'my', 'it', 'wont', 'doesnt', 'cant'];
    const problemKeywords = problem
      .toLowerCase()
      .split(' ')
      .filter(word => word.length > 2 && !commonWords.includes(word) && /^[a-z]+$/.test(word));
    
    if (errorCode) {
      problemKeywords.push(errorCode.toLowerCase());
    }

    const { error } = await supabase
      .from('diagnostics')
      .insert({
        email,
        appliance_type: appliance,
        appliance_brand: brand || null,
        problem_description: problem,
        error_code: errorCode || null,
        error_code_meaning: diagnosis.errorCodeMeaning || null,
        problem_keywords: problemKeywords,
        estimated_time: diagnosis.timeEstimate,
        estimated_cost: diagnosis.estimatedCost,
        difficulty_level: diagnosis.difficulty,
        priority_level: diagnosis.urgency,
        possible_causes: diagnosis.possibleCauses,
        diy_solutions: diagnosis.recommendations.diy,
        professional_services: diagnosis.recommendations.professional,
        recommended_action: diagnosis.recommendedService,
        source_urls: searchUrls || diagnosis.sourceUrls || null,
        converted_to_booking: false,
        was_cached: false, // Set to true when using cached results in future
        diagnosis_confidence: 1.0, // Can adjust based on AI model or cache match
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Database save error:', error)
    } else {
      console.log('Enhanced diagnostic saved to database successfully')
    }
  } catch (error) {
    console.error('Failed to save diagnostic to database:', error)
  }
}

// New function to check for cached similar diagnostics before calling AI
export async function checkCachedDiagnosis(
  appliance: string,
  brand: string,
  problem: string,
  errorCode: string | null
): Promise<DiagnosisResult | null> {
  try {
    // Call the fuzzy matching function
    const { data, error } = await supabase
      .rpc('search_similar_diagnostics', {
        p_appliance: appliance,
        p_brand: brand,
        p_problem: problem,
        p_error_code: errorCode,
        p_threshold: 0.4 // Adjust similarity threshold as needed
      })

    if (error) {
      console.error('Error searching cached diagnostics:', error)
      return null
    }

    if (!data || data.length === 0) {
      console.log('No similar cached diagnostics found')
      return null
    }

    // Get the best match (first result, already sorted by similarity)
    const bestMatch = data[0]
    
    // Only use cached result if similarity is very high or exact error code match
    if (bestMatch.similarity_score < 0.7 && bestMatch.error_code !== errorCode) {
      console.log(`Similarity score too low: ${bestMatch.similarity_score}`)
      return null
    }

    console.log(`Found cached diagnosis with similarity: ${bestMatch.similarity_score}`)
    
    // Convert cached result to DiagnosisResult format
    const cachedResult: DiagnosisResult = {
      errorCodeMeaning: bestMatch.error_code_meaning || undefined,
      possibleCauses: bestMatch.possible_causes,
      recommendations: {
        diy: bestMatch.diy_solutions,
        professional: bestMatch.professional_services
      },
      urgency: bestMatch.priority_level as "low" | "medium" | "high",
      estimatedCost: bestMatch.estimated_cost,
      difficulty: bestMatch.difficulty_level as "easy" | "moderate" | "difficult" | "expert",
      recommendedService: bestMatch.recommended_action as "diy" | "professional" | "warranty",
      serviceReason: `Based on ${bestMatch.occurrence_count} similar cases, this issue typically requires ${bestMatch.recommended_action} service.`,
      timeEstimate: bestMatch.estimated_time,
      // These might need to be reconstructed from the saved data
      skillsRequired: bestMatch.recommended_action === 'diy' 
        ? ["Basic tools", "Manual reading", "Safety awareness"]
        : ["Specialised diagnostic equipment", "Professional training", "Technical expertise"],
      safetyWarnings: [
        "Always disconnect power before attempting any inspection",
        "If unsure about any step, contact professional service immediately"
      ]
    }

    return cachedResult

  } catch (error) {
    console.error('Failed to check cached diagnostics:', error)
    return null
  }
}

// Updated main diagnosis function to use caching
export async function diagnoseProblem(
  appliance: string, 
  brand: string, 
  problem: string, 
  email: string
): Promise<DiagnosisResult> {
  try {
    const openRouterApiKey = process.env.OPENROUTER_API_KEY
    const searchApiKey = process.env.SERP_API_KEY || process.env.BRAVE_SEARCH_API_KEY

    // Detect error code if present
    const detectedErrorCode = detectErrorCode(problem)
    console.log(`Analysing: ${brand} ${appliance} - ${problem}${detectedErrorCode ? ` (Error: ${detectedErrorCode})` : ''}`)

    // Check for cached similar diagnosis first
    const cachedDiagnosis = await checkCachedDiagnosis(appliance, brand, problem, detectedErrorCode)
    
    if (cachedDiagnosis) {
      console.log('Using cached diagnosis result')
      // Save this as a new entry but mark it as cached
      await supabase
        .from('diagnostics')
        .insert({
          email,
          appliance_type: appliance,
          appliance_brand: brand || null,
          problem_description: problem,
          error_code: detectedErrorCode,
          error_code_meaning: cachedDiagnosis.errorCodeMeaning || null,
          estimated_time: cachedDiagnosis.timeEstimate,
          estimated_cost: cachedDiagnosis.estimatedCost,
          difficulty_level: cachedDiagnosis.difficulty,
          priority_level: cachedDiagnosis.urgency,
          possible_causes: cachedDiagnosis.possibleCauses,
          diy_solutions: cachedDiagnosis.recommendations.diy,
          professional_services: cachedDiagnosis.recommendations.professional,
          recommended_action: cachedDiagnosis.recommendedService,
          was_cached: true,
          diagnosis_confidence: 0.9, // Slightly lower confidence for cached results
          converted_to_booking: false,
          created_at: new Date().toISOString()
        })
      
      return cachedDiagnosis
    }

    // Continue with normal AI diagnosis if no cache hit
    if (!openRouterApiKey) {
      console.error('OpenRouter API key not found')
      return getEmergencyFallback(appliance, brand, problem)
    }

    let searchInfo = ''
    let searchUrls: string[] = []

    // If we have an error code and search API, search for specific information
    if (detectedErrorCode && searchApiKey) {
      console.log(`Searching for ${brand} ${detectedErrorCode} information...`)
      
      let searchResults
      if (process.env.SERP_API_KEY) {
        searchResults = await searchForErrorCode(brand, appliance, detectedErrorCode, process.env.SERP_API_KEY)
      } else if (process.env.BRAVE_SEARCH_API_KEY) {
        searchResults = await searchWithBraveAPI(brand, appliance, detectedErrorCode, process.env.BRAVE_SEARCH_API_KEY)
      }
      
      if (searchResults) {
        searchInfo = searchResults.relevantInfo
        searchUrls = searchResults.searchResults.map(r => r.url)
        console.log(`Found ${searchResults.searchResults.length} search results`)
      }
    }

    // Use AI with search results for diagnosis
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
      // Pass error code and search URLs to enhanced save function
      await saveDiagnosticToDatabase(appliance, brand, problem, email, aiResult, detectedErrorCode, searchUrls)
      return aiResult
    }

    // Fallback if AI fails
    console.log('AI diagnosis failed, using emergency fallback')
    const fallbackResult = getEmergencyFallback(appliance, brand, problem)
    await saveDiagnosticToDatabase(appliance, brand, problem, email, fallbackResult, detectedErrorCode)
    return fallbackResult

  } catch (error) {
    console.error("Diagnosis error:", error)
    const fallbackResult = getEmergencyFallback(appliance, brand, problem)
    await saveDiagnosticToDatabase(appliance, brand, problem, email, fallbackResult)
    return fallbackResult
  }
}

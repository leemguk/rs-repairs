"use server"

import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

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
    const { text } = await generateText({
      model: openai("gpt-4o"),
      system: `You are an expert appliance repair technician with 20+ years of experience. 
      Analyze appliance problems and provide diagnostic information in a structured format.
      
      Always respond with valid JSON in this exact format:
      {
        "possibleCauses": ["cause1", "cause2", "cause3"],
        "recommendations": {
          "diy": ["diy step 1", "diy step 2"],
          "professional": ["professional service 1", "professional service 2"]
        },
        "urgency": "low|medium|high",
        "estimatedCost": "$X - $Y",
        "difficulty": "easy|moderate|difficult|expert",
        "recommendedService": "diy|professional|warranty",
        "serviceReason": "Clear explanation of why this service is recommended",
        "skillsRequired": ["skill1", "skill2"] (only if DIY recommended),
        "timeEstimate": "X hours/days",
        "safetyWarnings": ["warning1", "warning2"] (if applicable)
      }
      
      Guidelines:
      - Difficulty levels: easy (basic tools, no electrical), moderate (some technical skill), difficult (electrical/complex), expert (specialized tools/dangerous)
      - Recommend "diy" for easy-moderate repairs, "professional" for difficult-expert or safety concerns, "warranty" for expensive/complex issues on older appliances
      - Always prioritize safety - if there's any electrical, gas, or safety risk, recommend professional
      - Provide realistic time estimates
      - Include safety warnings for any potentially dangerous repairs`,
      prompt: `Appliance: ${appliance}
      Problem: ${problem}
      
      Please diagnose this appliance problem, assess the repair difficulty, and recommend the most appropriate service option.`,
    })

    // Parse the JSON response
    const diagnosis = JSON.parse(text) as DiagnosisResult

    // Validate the response structure
    if (
      !diagnosis.possibleCauses ||
      !diagnosis.recommendations ||
      !diagnosis.difficulty ||
      !diagnosis.recommendedService
    ) {
      throw new Error("Invalid response structure")
    }

    return diagnosis
  } catch (error) {
    console.error("Diagnosis error:", error)

    // Fallback response
    return {
      possibleCauses: ["Component wear and tear", "Electrical connection issues", "Mechanical blockage or damage"],
      recommendations: {
        diy: [
          "Check power connections and ensure appliance is plugged in properly",
          "Clean any visible debris or buildup",
          "Consult your user manual for basic troubleshooting steps",
        ],
        professional: [
          "Professional diagnostic inspection",
          "Component replacement if needed",
          "Safety check and performance testing",
        ],
      },
      urgency: "medium",
      estimatedCost: "$75 - $250",
      difficulty: "moderate",
      recommendedService: "professional",
      serviceReason: "This issue requires professional assessment to ensure safe and proper repair",
      timeEstimate: "1-2 hours",
    }
  }
}

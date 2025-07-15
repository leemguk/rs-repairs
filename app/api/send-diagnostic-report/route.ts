import { NextRequest, NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'

// Set SendGrid API key
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

interface DiagnosticReportRequest {
  email: string
  appliance: string
  brand: string
  problem: string
  diagnosis: DiagnosisResult
  errorCode?: string | null
}

export async function POST(request: NextRequest) {
  try {
    const { email, appliance, brand, problem, diagnosis, errorCode }: DiagnosticReportRequest = await request.json()

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      )
    }

    // Validate diagnosis data
    if (!diagnosis || !appliance || !problem) {
      return NextResponse.json(
        { error: 'Missing required diagnostic data' },
        { status: 400 }
      )
    }

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

    // Send diagnostic report email
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

    return NextResponse.json({ 
      success: true, 
      message: 'Diagnostic report sent successfully' 
    })

  } catch (error) {
    console.error('Send diagnostic report error:', error)
    // Don't expose detailed error messages
    return NextResponse.json(
      { error: 'Failed to send diagnostic report', success: false },
      { status: 500 }
    )
  }
}
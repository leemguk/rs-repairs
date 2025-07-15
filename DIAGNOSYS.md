# DiagnoSys - AI-Powered Appliance Diagnostic Tool

## Overview

DiagnoSys is an intelligent appliance fault diagnosis system that combines AI analysis, web search enhancement, and intelligent caching to provide accurate, cost-effective diagnostic reports for UK appliance repair services.

## Features

- **AI-Powered Diagnosis**: Claude 3.5 Sonnet via OpenRouter API
- **Error Code Analytics**: Statistical analysis of error patterns and conversion rates
- **Intelligent Caching**: 70% reduction in AI API calls through similarity matching
- **Error Code Research**: Automated web search for brand-specific error codes
- **Email Verification**: Secure access with 6-digit verification codes
- **Professional Reports**: Comprehensive diagnostic reports with safety warnings
- **Service Recommendations**: DIY, professional, or warranty guidance based on historical data
- **Conversion Tracking**: Monitors booking conversion rates by error code and recommendation type
- **British Market Focus**: UK terminology, pricing, and compliance

## Architecture

### Frontend (`components/diagnostic-form.tsx`)
- React component with TypeScript
- Multi-step form with email verification
- Real-time validation and error handling
- Responsive design for mobile and desktop
- Example preview functionality

### Backend (`actions/diagnose.ts`)
- Server action for diagnosis processing
- AI integration with structured prompts
- Web search integration (SerpAPI/Brave Search)
- Database caching and similarity matching
- Comprehensive error handling and fallbacks

### Database (Supabase)
- PostgreSQL with real-time subscriptions
- Fuzzy text matching for cache optimization
- Email verification code management
- Diagnostic result storage and retrieval

## User Flow

### 1. Problem Input
```typescript
interface ProblemInput {
  appliance: string    // "Washing machine"
  brand?: string      // "Samsung" (optional)
  problem: string     // Detailed description with error codes
}
```

### 2. Email Verification
- User provides email address
- 6-digit verification code sent via SendGrid
- 10-minute expiration window
- One-time use with automatic cleanup

### 3. AI Analysis Process

#### Phase 1: Error Code Detection
```typescript
// Multiple regex patterns detect various error code formats
const errorCodePatterns = [
  /\b[ef][-\s]?(\d{1,3}[a-z]?)\b/gi,              // E13, F-13, E 13
  /\berror\s+code\s*[:\-]?\s*([a-z]?\d{1,3}[a-z]?)\b/gi,  // error code E13
  /\bcode\s*[:\-]?\s*([a-z]?\d{1,3}[a-z]?)\b/gi,          // code E13
  /\b(\d{1,2}[ef])\b/gi,                          // 13E format
  /\b([a-z]{1,2}\d{1,3})\b/gi,                    // LE1, HE5 format
]
```

#### Phase 2: Cache Check
```sql
-- Fuzzy matching function for similar diagnoses
SELECT * FROM search_similar_diagnostics(
  p_appliance := 'washing machine',
  p_brand := 'Samsung',
  p_problem := 'loud banging noise E4 error',
  p_error_code := 'E4',
  p_threshold := 0.5
)
```

**Cache Hit Criteria**:
- Similarity score ≥ 0.7 OR exact error code match
- Returns cached result (~70% of requests)
- Confidence score: 0.9 for cached, 1.0 for fresh AI

#### Phase 3: Web Search Enhancement
```javascript
// Search queries for error code information
const queries = [
  `${brand} ${appliance} error code ${errorCode} meaning fix`,
  `"${brand}" "${errorCode}" error washing machine solution`,
  `${brand} error ${errorCode} troubleshooting guide`
]
```

#### Phase 4: AI Diagnosis
Structured prompt sent to Claude 3.5 Sonnet:
```
You are a professional appliance repair engineer in the UK. 
A customer has a ${brand} ${appliance} with this problem: "${problem}"

Please provide a comprehensive diagnosis using this EXACT format:
- ERROR CODE MEANING
- POSSIBLE CAUSES
- DIY RECOMMENDATIONS  
- PROFESSIONAL SERVICES
- SERVICE TYPE, DIFFICULTY, URGENCY
- TIME ESTIMATE, COST ESTIMATE
- SKILLS NEEDED, SAFETY WARNINGS
- SERVICE REASON

Use BRITISH ENGLISH spelling and terminology throughout.
```

### 4. Result Processing

#### AI Response Parsing
```typescript
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
```

#### Data Validation & Sanitization
- Removes error code content from non-error diagnoses
- Ensures arrays aren't empty after filtering
- Caps professional costs at £149 maximum
- Validates service type, difficulty, and urgency levels

### 5. Database Storage
```sql
INSERT INTO diagnostics (
  email, appliance_type, appliance_brand, problem_description,
  error_code, error_code_meaning, estimated_time, estimated_cost,
  difficulty_level, priority_level, possible_causes,
  diy_solutions, professional_services, recommended_action,
  source_urls, was_cached, diagnosis_confidence,
  converted_to_booking, created_at
) VALUES (...)
```

## Database Schema

### diagnostics Table
```sql
CREATE TABLE diagnostics (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  email VARCHAR,
  appliance_type VARCHAR,
  appliance_brand VARCHAR,
  problem_description TEXT,
  estimated_time VARCHAR,
  estimated_cost VARCHAR,
  difficulty_level VARCHAR, -- 'easy', 'moderate', 'difficult', 'expert'
  priority_level VARCHAR,   -- 'low', 'medium', 'high'
  possible_causes TEXT[],
  diy_solutions TEXT[],
  professional_services TEXT[],
  recommended_action VARCHAR, -- 'diy', 'professional', 'warranty'
  converted_to_booking BOOLEAN DEFAULT false,
  booking_id VARCHAR,
  error_code VARCHAR,
  error_code_meaning TEXT,
  problem_keywords TEXT[],
  diagnosis_confidence DECIMAL DEFAULT 1.0,
  was_cached BOOLEAN DEFAULT false,
  source_urls TEXT[]
);
```

### error_code_statistics Table
```sql
CREATE TABLE error_code_statistics (
  appliance_type VARCHAR,
  appliance_brand VARCHAR,
  error_code VARCHAR,
  error_code_meaning TEXT,
  total_occurrences INTEGER,
  unique_customers INTEGER,
  booking_conversion_rate DECIMAL,
  most_common_recommendation VARCHAR, -- 'diy', 'professional', 'warranty'
  typical_difficulty VARCHAR,         -- 'easy', 'moderate', 'difficult', 'expert'
  typical_urgency VARCHAR,            -- 'low', 'medium', 'high'
  PRIMARY KEY (appliance_type, appliance_brand, error_code)
);
```
**Purpose**: Aggregated statistics for error code analysis and pattern recognition.

### verification_codes Table
```sql
CREATE TABLE verification_codes (
  email VARCHAR NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### search_similar_diagnostics Function
PostgreSQL stored function using fuzzy text matching (`pg_trgm` extension) to find similar diagnoses based on:
- Appliance type similarity
- Brand matching
- Problem description similarity
- Error code exact matches
- Configurable similarity threshold
- **Integration with error_code_statistics**: Leverages aggregated error code data for enhanced matching

**Function Returns**:
- All diagnostics table columns plus computed fields:
  - `similarity_score`: Fuzzy matching confidence (0.0-1.0)
  - `occurrence_count`: Number of similar cases from error_code_statistics

## Error Code Statistics Integration

### Statistical Analysis
The `error_code_statistics` table provides crucial insights for improving diagnostic accuracy:

```sql
-- Example statistics data
SELECT 
  appliance_type,
  appliance_brand,
  error_code,
  total_occurrences,
  booking_conversion_rate,
  most_common_recommendation
FROM error_code_statistics
WHERE appliance_type = 'washing machine' AND appliance_brand = 'bosch';
```

### Sample Data Structure
```json
{
  "appliance_type": "washing machine",
  "appliance_brand": "bosch", 
  "error_code": "E18",
  "error_code_meaning": "Water drainage problem",
  "total_occurrences": 7,
  "unique_customers": 4,
  "booking_conversion_rate": 0.0,
  "most_common_recommendation": "diy",
  "typical_difficulty": "moderate",
  "typical_urgency": "medium"
}
```

### Usage in Diagnosis Process
1. **Pattern Recognition**: Identifies common error code patterns
2. **Recommendation Optimization**: Uses historical success rates to improve recommendations
3. **Conversion Analysis**: Tracks which recommendations lead to bookings
4. **Difficulty Assessment**: Leverages aggregated difficulty ratings
5. **Cache Enhancement**: Improves similarity matching with statistical context

## API Endpoints

### Email Verification

#### POST `/api/send-verification`
```json
{
  "email": "user@example.com"
}
```

Response:
```json
{
  "success": true,
  "message": "Verification code sent successfully"
}
```

#### POST `/api/verify-code`
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

Response:
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

### Diagnosis Processing

#### Server Action: `diagnoseProblem`
```typescript
export async function diagnoseProblem(
  appliance: string, 
  brand: string, 
  problem: string, 
  email: string
): Promise<DiagnosisResult>
```

## Configuration

### Environment Variables
```bash
# AI & Search APIs
OPENROUTER_API_KEY=your_openrouter_key
SERP_API_KEY=your_serp_api_key
# OR
BRAVE_SEARCH_API_KEY=your_brave_search_key

# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Email
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM_EMAIL=your_from_email
```

### Performance Tuning
```javascript
// Cache configuration
const CACHE_THRESHOLD = 0.7;  // Similarity threshold for cache hits
const CACHE_CONFIDENCE = 0.9;  // Confidence score for cached results

// Cost optimization
const MAX_PROFESSIONAL_COST = 149;  // Maximum professional service cost
const MAX_DIY_COST = 50;           // Maximum DIY repair cost

// Search configuration
const MAX_SEARCH_RESULTS = 10;     // Maximum search results per query
const SEARCH_TIMEOUT = 5000;       // Search timeout in milliseconds
```

## Security Features

### Email Verification
- 6-digit numeric codes (100000-999999)
- 10-minute expiration window
- One-time use with automatic cleanup
- Email normalization (lowercase)
- Input validation and sanitization

### Data Protection
- No sensitive data in responses
- Secure API key management
- CORS configuration for widget embedding
- Input sanitization and validation
- SQL injection prevention

### Rate Limiting
- Email verification cooldown
- API usage monitoring
- Database query optimization
- Cache-first approach

## Error Handling

### Fallback Mechanisms
```typescript
function getEmergencyFallback(
  appliance: string, 
  brand: string, 
  problem: string
): DiagnosisResult {
  const isSafetyIssue = problem.toLowerCase().includes('smoke') || 
                       problem.toLowerCase().includes('sparking') || 
                       problem.toLowerCase().includes('burning')

  return {
    // Emergency diagnostic response
    urgency: isSafetyIssue ? "high" : "medium",
    recommendedService: "professional",
    serviceReason: "Diagnostic system unavailable - professional inspection required for safety and accurate diagnosis."
  }
}
```

### Error Categories
- **Network Errors**: API timeouts, connection failures
- **AI Errors**: OpenRouter API failures, parsing errors
- **Database Errors**: Connection issues, query failures
- **Validation Errors**: Invalid input, missing fields
- **Search Errors**: External API failures, rate limiting

## Performance Metrics

### Cache Performance
- **Hit Rate**: ~70% of requests served from cache
- **Response Time**: <2 seconds for cached results
- **Cost Reduction**: 70% reduction in AI API costs
- **Accuracy**: 0.9 confidence score for cached results

### AI Performance
- **Response Time**: <5 seconds for AI analysis
- **Success Rate**: >95% successful diagnoses
- **Accuracy**: Professional-grade diagnostic quality
- **Cost**: Optimized through caching and fallbacks

### Email Verification
- **Delivery Rate**: >99% successful deliveries
- **Verification Time**: Average 2-3 minutes
- **Code Expiration**: 10-minute window
- **Cleanup**: Automatic expired code removal

## Usage Examples

### Basic Usage
```typescript
// User inputs
const diagnosis = await diagnoseProblem(
  "Washing machine",
  "Samsung", 
  "Making loud banging noise during spin cycle, showing error code E4",
  "user@example.com"
);

// Results
console.log(diagnosis.errorCodeMeaning); // "E4 indicates unbalanced load error"
console.log(diagnosis.recommendedService); // "professional"
console.log(diagnosis.estimatedCost); // "£109-£149"
```

### Cache Hit Example
```typescript
// Similar problem from cache
const cachedDiagnosis = await checkCachedDiagnosis(
  "washing machine",
  "Samsung",
  "loud noise E4 error spin cycle",
  "E4"
);

// Returns cached result with 0.9 confidence
console.log(cachedDiagnosis.was_cached); // true
console.log(cachedDiagnosis.diagnosis_confidence); // 0.9
```

### Error Code Detection
```typescript
// Various error code formats detected
detectErrorCode("Machine shows E13 error");        // "E13"
detectErrorCode("error code F-05 displayed");      // "F05"
detectErrorCode("Getting 13E fault code");         // "E13"
detectErrorCode("LE1 appears on display");         // "LE1"
```

## Integration

### Widget Embedding
```html
<iframe src="https://domain.com/widget/booking" 
        id="rs-repairs-booking" 
        style="width: 100%; border: none;">
</iframe>
```

### API Integration
```typescript
// Direct API usage
const response = await fetch('/api/diagnose', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    appliance: 'washing machine',
    brand: 'Samsung',
    problem: 'Error E4 loud noise',
    email: 'user@example.com'
  })
});
```

## Maintenance

### Database Maintenance
```sql
-- Clean expired verification codes
DELETE FROM verification_codes WHERE expires_at < NOW();

-- Update cache statistics
UPDATE diagnostics SET was_cached = true WHERE similarity_score > 0.7;

-- Performance monitoring
SELECT 
  COUNT(*) as total_diagnostics,
  COUNT(*) FILTER (WHERE was_cached = true) as cached_count,
  AVG(diagnosis_confidence) as avg_confidence
FROM diagnostics;
```

### Monitoring
- API response times
- Cache hit rates
- Database query performance
- Email delivery rates
- Error frequencies

### Updates
- AI model updates via OpenRouter
- Search API configuration changes
- Database schema migrations
- Frontend component updates

## Troubleshooting

### Common Issues
1. **Cache Not Working**: Check `search_similar_diagnostics` function
2. **AI Responses Poor**: Verify OpenRouter API key and model
3. **Email Not Sending**: Check SendGrid configuration
4. **Database Errors**: Verify Supabase connection
5. **Search Failing**: Check SerpAPI/Brave Search keys

### Debug Mode
```typescript
// Enable debug logging
console.log('Checking cache for:', { appliance, brand, problem, errorCode });
console.log('AI Response:', aiResponse);
console.log('Parsed diagnosis result:', JSON.stringify(result, null, 2));
```

## Future Enhancements

### Planned Features
- Machine learning model training on diagnostic data
- Multi-language support beyond British English
- Integration with parts inventory systems
- Real-time diagnostic confidence scoring
- Advanced analytics and reporting

### Performance Optimizations
- Redis caching layer
- Database query optimization
- CDN integration for static assets
- Background job processing
- API response compression

## Support

For technical support or questions about the DiagnoSys tool:
- Review the codebase documentation
- Check environment variable configuration
- Monitor application logs for errors
- Verify API key validity and quotas
- Test database connections and queries

---

*DiagnoSys is part of the RS Repairs platform by Ransom Spares Ltd.*
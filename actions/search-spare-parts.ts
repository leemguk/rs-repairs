// actions/search-spare-parts.ts
'use server';

import { createClient } from '@/lib/supabase';
import { validateSparePartsCategory, validateSparePartsBrand, validateSparePartsModel, sanitizeInput } from '@/lib/validation';
import { sanitizeUrl } from '@/lib/sanitization';

// Rate limiting for server-side protection
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_SEARCHES_PER_WINDOW = 20;

export interface SparePartResult {
  id: string;
  category: string;
  brand: string;
  model_number: string;
  url: string;
  match_type: 'exact' | 'fuzzy';
  similarity_score: number;
}

// Check rate limit
function checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  // Clean up old entries
  if (record && now > record.resetTime) {
    rateLimitMap.delete(identifier);
  }
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }
  
  if (record.count >= MAX_SEARCHES_PER_WINDOW) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  record.count++;
  return { allowed: true };
}

export async function searchSpareParts(
  category: string,
  brand: string,
  modelNumber: string
): Promise<{ results: SparePartResult[]; error?: string }> {
  try {
    // Validate inputs
    const categoryValidation = validateSparePartsCategory(category);
    if (!categoryValidation.isValid) {
      return { results: [], error: categoryValidation.errors[0] };
    }
    
    const brandValidation = validateSparePartsBrand(brand);
    if (!brandValidation.isValid) {
      return { results: [], error: brandValidation.errors[0] };
    }
    
    const modelValidation = validateSparePartsModel(modelNumber);
    if (!modelValidation.isValid) {
      return { results: [], error: modelValidation.errors[0] };
    }
    
    // Rate limiting - use a combination of inputs as identifier
    const rateLimitKey = `spare-parts:${category}:${brand}`;
    const rateLimit = checkRateLimit(rateLimitKey);
    
    if (!rateLimit.allowed) {
      return { 
        results: [], 
        error: `Rate limit exceeded. Please wait ${rateLimit.retryAfter} seconds.` 
      };
    }
    
    // Sanitize inputs
    const sanitizedCategory = sanitizeInput(category);
    const sanitizedBrand = sanitizeInput(brand);
    const sanitizedModel = sanitizeInput(modelNumber);
    
    const supabase = createClient();
    
    // Call the search function we created in SQL
    const { data, error } = await supabase
      .rpc('search_spare_parts', {
        p_category: sanitizedCategory,
        p_brand: sanitizedBrand,
        p_model: sanitizedModel
      });

    if (error) {
      // Don't log sensitive error details in production
      if (process.env.NODE_ENV !== 'production') {
        console.error('Search error:', error);
      }
      return { 
        results: [], 
        error: 'Failed to search spare parts. Please try again.' 
      };
    }
    
    // Sanitize URLs in results
    const sanitizedResults = (data || []).map((result: SparePartResult) => ({
      ...result,
      url: sanitizeUrl(result.url)
    }));

    return { results: sanitizedResults };
  } catch (error) {
    // Don't log sensitive error details in production
    if (process.env.NODE_ENV !== 'production') {
      console.error('Unexpected error:', error);
    }
    return { 
      results: [], 
      error: 'An unexpected error occurred. Please try again.' 
    };
  }
}

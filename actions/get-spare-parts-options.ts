// actions/get-spare-parts-options.ts
'use server';

import { createClient } from '@/lib/supabase';
import { validateSparePartsCategory, validateSparePartsBrand, validateSparePartsSearchTerm, sanitizeInput } from '@/lib/validation';

// Rate limiting for server-side protection
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_LOOKUPS_PER_WINDOW = 100; // Higher limit for autocomplete lookups

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
  
  if (record.count >= MAX_LOOKUPS_PER_WINDOW) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  record.count++;
  return { allowed: true };
}

export async function getSparePartsCategories(): Promise<string[]> {
  try {
    // Rate limiting - use a generic identifier for categories
    const rateLimit = checkRateLimit('spare-parts:categories');
    if (!rateLimit.allowed) {
      return []; // Return empty array on rate limit
    }
    
    const supabase = createClient();
    
    // Use ONLY the RPC function - it already returns ALL distinct categories
    const { data, error } = await supabase
      .rpc('get_spare_parts_categories');
    
    if (error) {
      // Don't log sensitive error details in production
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error calling get_spare_parts_categories:', error);
      }
      return [];
    }

    if (!data || !Array.isArray(data)) {
      return [];
    }

    // The RPC returns {category: "..."} objects
    const categories = data
      .map(item => item.category || item.get_spare_parts_categories)
      .filter(Boolean);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Loaded ${categories.length} categories from RPC`);
    }
    return categories;
    
  } catch (error) {
    // Don't log sensitive error details in production
    if (process.env.NODE_ENV !== 'production') {
      console.error('Unexpected error:', error);
    }
    return [];
  }
}

export async function getSparePartsBrands(category?: string): Promise<string[]> {
  try {
    // Validate category if provided
    if (category) {
      const categoryValidation = validateSparePartsCategory(category);
      if (!categoryValidation.isValid) {
        return [];
      }
    }
    
    // Rate limiting
    const rateLimitKey = category ? `spare-parts:brands:${category}` : 'spare-parts:brands:all';
    const rateLimit = checkRateLimit(rateLimitKey);
    if (!rateLimit.allowed) {
      return [];
    }
    
    const supabase = createClient();
    
    if (!category) {
      // Use the RPC function for ALL brands
      const { data, error } = await supabase
        .rpc('get_spare_parts_brands');
      
      if (!error && data) {
        const brands = data
          .map(item => item.brand || item.get_spare_parts_brands)
          .filter(Boolean);
        return brands;
      }
      return [];
    }
    
    // Sanitize category input
    const sanitizedCategory = sanitizeInput(category);
    
    // Use RPC function for brands by category
    const { data, error } = await supabase
      .rpc('get_spare_parts_brands_by_category', { p_category: sanitizedCategory });
    
    if (error) {
      // Don't log sensitive error details in production
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error fetching brands for category:', error);
      }
      return [];
    }
    
    if (!data) {
      return [];
    }
    
    // Extract brands from the response
    const brands = data
      .map(item => item.brand || item.get_spare_parts_brands_by_category)
      .filter(Boolean);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Found ${brands.length} brands for category: ${category}`);
    }
    return brands;
    
  } catch (error) {
    // Don't log sensitive error details in production
    if (process.env.NODE_ENV !== 'production') {
      console.error('Unexpected error:', error);
    }
    return [];
  }
}

export async function getSparePartsModels(category: string, brand: string, search: string = ''): Promise<string[]> {
  try {
    // Validate inputs
    const categoryValidation = validateSparePartsCategory(category);
    if (!categoryValidation.isValid) {
      return [];
    }
    
    const brandValidation = validateSparePartsBrand(brand);
    if (!brandValidation.isValid) {
      return [];
    }
    
    const searchValidation = validateSparePartsSearchTerm(search);
    if (!searchValidation.isValid) {
      return [];
    }
    
    // Rate limiting
    const rateLimitKey = `spare-parts:models:${category}:${brand}`;
    const rateLimit = checkRateLimit(rateLimitKey);
    if (!rateLimit.allowed) {
      return [];
    }
    
    // Sanitize inputs
    const sanitizedCategory = sanitizeInput(category);
    const sanitizedBrand = sanitizeInput(brand);
    const sanitizedSearch = sanitizeInput(search);
    
    const supabase = createClient();
    
    // Use RPC function with search parameter
    const { data, error } = await supabase
      .rpc('search_spare_parts_models', { 
        p_category: sanitizedCategory,
        p_brand: sanitizedBrand,
        p_search: sanitizedSearch
      });
    
    if (error) {
      // Don't log sensitive error details in production
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error fetching models:', error);
      }
      return [];
    }
    
    if (!data) {
      return [];
    }
    
    // Extract models from the response
    const models = data
      .map(item => item.model_number || item.search_spare_parts_models)
      .filter(Boolean);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Found ${models.length} models matching "${search}" for ${brand} ${category}`);
    }
    return models;
    
  } catch (error) {
    // Don't log sensitive error details in production
    if (process.env.NODE_ENV !== 'production') {
      console.error('Unexpected error:', error);
    }
    return [];
  }
}

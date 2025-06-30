// actions/get-spare-parts-options.ts
'use server';

import { createClient export async function getSparePartsModels(category: string, brand: string): Promise<string[]> {
  try {
    const supabase = createClient();
    
    // Use RPC function for models by category and brand
    const { data, error } = await supabase
      .rpc('get_spare_parts_models', { 
        p_category: category,
        p_brand: brand 
      });
    
    if (error) {
      console.error('Error fetching models:', error);
      return [];
    }
    
    if (!data) {
      return [];
    }
    
    // Extract models from the response
    const models = data
      .map(item => item.model_number || item.get_spare_parts_models)
      .filter(Boolean);
    
    console.log(`Found ${models.length} models for ${brand} ${category}`);
    return models;
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return [];
  }
} from '@/lib/supabase';

export async function getSparePartsCategories(): Promise<string[]> {
  try {
    const supabase = createClient();
    
    // Use ONLY the RPC function - it already returns ALL distinct categories
    const { data, error } = await supabase
      .rpc('get_spare_parts_categories');
    
    if (error) {
      console.error('Error calling get_spare_parts_categories:', error);
      return [];
    }

    if (!data || !Array.isArray(data)) {
      return [];
    }

    // The RPC returns {category: "..."} objects
    const categories = data
      .map(item => item.category || item.get_spare_parts_categories)
      .filter(Boolean);
    
    console.log(`Loaded ${categories.length} categories from RPC`);
    return categories;
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return [];
  }
}

export async function getSparePartsBrands(category?: string): Promise<string[]> {
  try {
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
    
    // Use RPC function for brands by category
    const { data, error } = await supabase
      .rpc('get_spare_parts_brands_by_category', { p_category: category });
    
    if (error) {
      console.error('Error fetching brands for category:', error);
      return [];
    }
    
    if (!data) {
      return [];
    }
    
    // Extract brands from the response
    const brands = data
      .map(item => item.brand || item.get_spare_parts_brands_by_category)
      .filter(Boolean);
    
    console.log(`Found ${brands.length} brands for category: ${category}`);
    return brands;
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return [];
  }
}

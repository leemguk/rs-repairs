'use server';

import { createClient } from '@/lib/supabase';

export async function getDiagnosisApplianceTypes(): Promise<string[]> {
  try {
    const supabase = createClient();
    
    // Use the same RPC function as spare parts
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
    
    console.log(`Loaded ${categories.length} categories for diagnosis`);
    return categories;
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return [];
  }
}

export async function getDiagnosisBrands(applianceType: string): Promise<string[]> {
  try {
    const supabase = createClient();
    
    if (!applianceType) {
      return [];
    }
    
    // Use RPC function for brands by category
    const { data, error } = await supabase
      .rpc('get_spare_parts_brands_by_category', { p_category: applianceType });
    
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
    
    console.log(`Found ${brands.length} brands for category: ${applianceType}`);
    return brands;
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return [];
  }
}

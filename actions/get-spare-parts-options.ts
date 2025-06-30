// actions/get-spare-parts-options.ts
'use server';

import { createClient } from '@/lib/supabase';

export async function getSparePartsCategories(): Promise<string[]> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .rpc('get_spare_parts_categories');

    if (error) {
      console.error('Error fetching categories:', error);
      // Fallback to direct query
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('spare_parts')
        .select('category')
        .order('category');
      
      if (fallbackError) {
        console.error('Fallback error:', fallbackError);
        return [];
      }
      
      // Get unique categories
      const uniqueCategories = [...new Set(fallbackData?.map(item => item.category).filter(Boolean) || [])];
      return uniqueCategories;
    }

    // The RPC returns objects like {"get_spare_parts_categories": "Vacuum Cleaners"}
    // Extract the category value from each object
    return data?.map(item => item.get_spare_parts_categories || item.category).filter(Boolean) || [];
  } catch (error) {
    console.error('Unexpected error:', error);
    return [];
  }
}

export async function getSparePartsBrands(): Promise<string[]> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .rpc('get_spare_parts_brands');

    if (error) {
      console.error('Error fetching brands:', error);
      // Fallback to direct query
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('spare_parts')
        .select('brand')
        .order('brand');
      
      if (fallbackError) {
        console.error('Fallback error:', fallbackError);
        return [];
      }
      
      // Get unique brands
      const uniqueBrands = [...new Set(fallbackData?.map(item => item.brand).filter(Boolean) || [])];
      return uniqueBrands;
    }

    // The RPC returns objects like {"get_spare_parts_brands": "AEG"}
    // Extract the brand value from each object
    return data?.map(item => item.get_spare_parts_brands || item.brand).filter(Boolean) || [];
  } catch (error) {
    console.error('Unexpected error:', error);
    return [];
  }
}

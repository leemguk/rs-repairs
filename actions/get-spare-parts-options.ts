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
      return [];
    }

    // The RPC returns objects like {"get_spare_parts_categories": "Vacuum Cleaners"}
    // Extract the category value from each object
    if (data && Array.isArray(data)) {
      return data.map(item => {
        // Handle the specific format returned by your SQL function
        if (typeof item === 'object' && item.get_spare_parts_categories) {
          return item.get_spare_parts_categories;
        }
        // Fallback if the format is different
        return item.category || item;
      }).filter(Boolean);
    }

    return [];
  } catch (error) {
    console.error('Unexpected error in getSparePartsCategories:', error);
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
      return [];
    }

    // The RPC returns objects like {"get_spare_parts_brands": "AEG"}
    // Extract the brand value from each object
    if (data && Array.isArray(data)) {
      return data.map(item => {
        // Handle the specific format returned by your SQL function
        if (typeof item === 'object' && item.get_spare_parts_brands) {
          return item.get_spare_parts_brands;
        }
        // Fallback if the format is different
        return item.brand || item;
      }).filter(Boolean);
    }

    return [];
  } catch (error) {
    console.error('Unexpected error in getSparePartsBrands:', error);
    return [];
  }
}

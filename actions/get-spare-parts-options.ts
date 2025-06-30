// actions/get-spare-parts-options.ts
'use server';

import { supabase } from '@/lib/supabase';

export async function getSparePartsCategories(): Promise<string[]> {
  try {
    // Direct query to get all unique categories
    const { data, error } = await supabase
      .from('spare_parts')
      .select('category')
      .not('category', 'is', null)
      .limit(1000);

    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }

    // Extract unique categories
    const uniqueCategories = [...new Set(data?.map(item => item.category).filter(Boolean) || [])];
    return uniqueCategories.sort();
    
  } catch (error) {
    console.error('Unexpected error in getSparePartsCategories:', error);
    return [];
  }
}

export async function getSparePartsBrands(): Promise<string[]> {
  try {
    // Direct query to get all unique brands
    const { data, error } = await supabase
      .from('spare_parts')
      .select('brand')
      .not('brand', 'is', null)
      .limit(1000);

    if (error) {
      console.error('Error fetching brands:', error);
      return [];
    }

    // Extract unique brands
    const uniqueBrands = [...new Set(data?.map(item => item.brand).filter(Boolean) || [])];
    return uniqueBrands.sort();
    
  } catch (error) {
    console.error('Unexpected error in getSparePartsBrands:', error);
    return [];
  }
}

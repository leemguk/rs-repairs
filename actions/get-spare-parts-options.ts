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

    return data?.map(item => item.category) || [];
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
      return [];
    }

    return data?.map(item => item.brand) || [];
  } catch (error) {
    console.error('Unexpected error:', error);
    return [];
  }
}

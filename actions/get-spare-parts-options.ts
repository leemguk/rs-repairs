// actions/get-spare-parts-options.ts
'use server';

import { createClient } from '@/lib/supabase';

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
    
    // For a specific category, we still need to query the table
    // But we DON'T use a limit - we get ALL brands for that category
    const { data, error } = await supabase
      .from('spare_parts')
      .select('brand')
      .eq('category', category)
      .not('brand', 'is', null);
    
    if (error) {
      console.error('Error fetching brands:', error);
      return [];
    }
    
    // Extract unique brands
    const uniqueBrands = [...new Set(data?.map(item => item.brand).filter(Boolean) || [])];
    console.log(`Found ${uniqueBrands.length} brands for category: ${category}`);
    return uniqueBrands.sort();
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return [];
  }
}

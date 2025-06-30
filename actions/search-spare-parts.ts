// actions/search-spare-parts.ts
'use server';

import { createClient } from '@/lib/supabase';

export interface SparePartResult {
  id: string;
  category: string;
  brand: string;
  model_number: string;
  url: string;
  match_type: 'exact' | 'fuzzy';
  similarity_score: number;
}

export async function searchSpareParts(
  category: string,
  brand: string,
  modelNumber: string
): Promise<{ results: SparePartResult[]; error?: string }> {
  try {
    const supabase = createClient();
    
    // Call the search function we created in SQL
    const { data, error } = await supabase
      .rpc('search_spare_parts', {
        p_category: category,
        p_brand: brand,
        p_model: modelNumber
      });

    if (error) {
      console.error('Search error:', error);
      return { 
        results: [], 
        error: 'Failed to search spare parts. Please try again.' 
      };
    }

    return { results: data || [] };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { 
      results: [], 
      error: 'An unexpected error occurred. Please try again.' 
    };
  }
}

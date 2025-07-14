'use server';

import { createClient } from '@/lib/supabase';

/**
 * Get all appliance categories for repair bookings (for dropdown)
 * Returns categories ordered by display_order
 */
export async function getRepairBookingCategories(): Promise<string[]> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('appliance_repair_categories')
      .select('category')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (error) {
      console.error('Error fetching repair categories:', error);
      return [];
    }

    if (!data || !Array.isArray(data)) {
      return [];
    }

    const categories = data.map(item => item.category).filter(Boolean);
    
    console.log(`Loaded ${categories.length} repair categories`);
    return categories;
    
  } catch (error) {
    console.error('Unexpected error fetching repair categories:', error);
    return [];
  }
}

/**
 * Get all appliance brands for repair bookings (for autocomplete)
 * Returns all active brands for type-to-search functionality
 */
export async function getRepairBookingBrands(): Promise<string[]> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('appliance_repair_brands')
      .select('brand')
      .eq('is_active', true)
      .order('brand', { ascending: true });
    
    if (error) {
      console.error('Error fetching repair brands:', error);
      return [];
    }
    
    if (!data || !Array.isArray(data)) {
      return [];
    }
    
    const brands = data.map(item => item.brand).filter(Boolean);
    
    console.log(`Loaded ${brands.length} repair brands`);
    return brands;
    
  } catch (error) {
    console.error('Unexpected error fetching repair brands:', error);
    return [];
  }
}

/**
 * Get price for a specific brand
 * Returns the repair price for the given brand, or default £169 if not found
 */
export async function getRepairBrandPrice(brand: string): Promise<number> {
  try {
    if (!brand) {
      return 169.00; // Default price
    }

    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('appliance_repair_brands')
      .select('price')
      .eq('brand', brand)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      console.log(`Brand '${brand}' not found in repair brands, using default price £169.00`);
      return 169.00; // Default price if brand not found
    }
    
    return Number(data.price) || 169.00;
    
  } catch (error) {
    console.error('Error fetching brand price:', error);
    return 169.00; // Default price on error
  }
}
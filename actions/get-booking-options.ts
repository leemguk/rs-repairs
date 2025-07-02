'use server';

import { supabase } from '@/lib/supabase';

export async function getBookingApplianceTypes(): Promise<string[]> {
  try {
    // Use the same RPC function as spare parts to get categories efficiently
    const { data, error } = await supabase
      .rpc('get_spare_parts_categories');

    if (error) {
      console.error('Error fetching appliance types:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getBookingApplianceTypes:', error);
    return [];
  }
}

export async function getBookingBrands(applianceType: string): Promise<string[]> {
  try {
    if (!applianceType) return [];

    // Use the same RPC function as spare parts to get brands efficiently
    const { data, error } = await supabase
      .rpc('get_spare_parts_brands', {
        category_param: applianceType
      });

    if (error) {
      console.error('Error fetching brands:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getBookingBrands:', error);
    return [];
  }
}

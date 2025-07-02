'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// Get distinct appliance types/categories from the database
export async function getBookingApplianceTypes(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('spare_parts')
      .select('category')
      .order('category')

    if (error) {
      console.error('Error fetching appliance types:', error)
      return []
    }

    // Get unique categories and filter out any nulls
    const uniqueCategories = [...new Set(data?.map(item => item.category).filter(Boolean))] as string[]
    
    return uniqueCategories
  } catch (error) {
    console.error('Error in getBookingApplianceTypes:', error)
    return []
  }
}

// Get brands for a specific appliance type
export async function getBookingBrands(applianceType: string): Promise<string[]> {
  try {
    if (!applianceType) return []

    const { data, error } = await supabase
      .from('spare_parts')
      .select('brand')
      .eq('category', applianceType)
      .order('brand')

    if (error) {
      console.error('Error fetching brands:', error)
      return []
    }

    // Get unique brands and filter out any nulls
    const uniqueBrands = [...new Set(data?.map(item => item.brand).filter(Boolean))] as string[]
    
    return uniqueBrands
  } catch (error) {
    console.error('Error in getBookingBrands:', error)
    return []
  }
}

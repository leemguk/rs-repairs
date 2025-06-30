import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Export the pre-created instance (for backward compatibility)
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey)

// Export a function to create new instances
export function createClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey)
}

// Types for our database tables
export interface Booking {
  id: string
  created_at: string
  full_name: string
  email: string
  mobile: string
  address: string
  appliance_type: string
  manufacturer: string
  model?: string
  fault_description: string
  service_type: 'same_day' | 'next_day' | 'standard'
  service_price: number
  appointment_date?: string
  appointment_time?: string
  stripe_payment_id?: string
  payment_status: 'pending' | 'paid' | 'failed'
  booking_status: 'confirmed' | 'completed' | 'cancelled'
}

export interface Diagnostic {
  id: string
  created_at: string
  email: string
  appliance_type: string
  problem_description: string
  estimated_time?: string
  estimated_cost?: string
  difficulty_level?: string
  priority_level?: string
  possible_causes?: string[]
  diy_solutions?: string[]
  professional_services?: string[]
  recommended_action?: 'diy' | 'professional' | 'parts'
  converted_to_booking: boolean
  booking_id?: string
}

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aeswwrtcbbeqwqokwgsy.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlc3d3cnRjYmJlcXdxb2t3Z3N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjE0MTEsImV4cCI6MjA4Njg5NzQxMX0.lORytMyDJUsMFZ-j69niGEhm-rVzfuSqQ53l53Y46DA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Property {
  id: number
  address: string
  suburb: string
  bedrooms: number | null
  bathrooms: number | null
  car_spaces: number | null
  land_size: number | null
  price: string | null
  price_numeric: number | null
  domain_url: string
  main_photo_url: string | null
  has_pool: boolean
  under_offer: boolean
  property_type: string | null
  first_seen_date: string | null
  latitude: number | null
  longitude: number | null
  original_price: number | null
  price_drop_amount: number | null
  beach_distance_km: number | null
  vendor_motivation_score: number | null
  is_best_value: boolean | null
  status: string | null
}

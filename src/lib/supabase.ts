import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aeswwrtcbbeqwqokwgsy.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlc3d3cnRjYmJlcXdxb2t3Z3N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjE0MTEsImV4cCI6MjA4Njg5NzQxMX0.lORytMyDJUsMFZ-j69niGEhm-rVzfuSqQ53l53Y46DA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Property {
  id: string
  address: string
  suburb: string
  postcode: string | null
  bedrooms: number
  bathrooms: number
  car_spaces: number
  land_size: number | null
  floor_area: number | null
  price_display: string | null
  price_numeric: number | null
  url: string
  source: string | null
  status: string | null
  under_offer: boolean
  pool: boolean
  inspection_times: string | null
  photo_url: string | null
  property_type: string | null
  first_seen_date: string | null
  last_seen_date: string | null
  last_emailed_at: string | null
  original_price: number | null
  price_drop_amount: number | null
  price_drop_date: string | null
  latitude: number | null
  longitude: number | null
  created_at: string | null
  updated_at: string | null
  agent_name: string | null
  agency_name: string | null
  // Computed fields (not in DB but can be calculated)
  beach_distance_km?: number | null
}

export interface Comparable {
  id: number
  suburb: string
  bedrooms: number
  avg_sold_price: number
  median_sold_price: number
  sale_count: number
  last_updated: string
}

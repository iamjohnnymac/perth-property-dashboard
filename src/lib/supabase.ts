import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aeswwrtcbbeqwqokwgsy.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlc3d3cnRjYmJlcXdxb2t3Z3N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjE0MTEsImV4cCI6MjA4Njg5NzQxMX0.lORytMyDJUsMFZ-j69niGEhm-rVzfuSqQ53l53Y46DA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Property {
  id: number
  address: string
  suburb: string
  bedrooms: number
  bathrooms: number
  car_spaces: number
  land_size: number | null
  price_display: string | null
  price_numeric: number | null
  url: string
  photo_url: string | null
  pool: boolean
  under_offer: boolean
  property_type: string | null
  first_seen_date: string | null
  last_seen_date: string | null
  latitude: number | null
  longitude: number | null
  original_price: number | null
  price_drop_amount: number | null
  beach_distance_km: number | null
  motivation_score: number | null
  status: string
  agent_name: string | null
  agency_name: string | null
  inspection_open_time: string | null
  inspection_close_time: string | null
  estimated_price: number | null
  estimated_price_confidence: string | null
  estimated_price_comparables: number | null
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

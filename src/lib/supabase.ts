import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aeswwrtcbbeqwqokwgsy.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlc3d3cnRjYmJlcXdxb2t3Z3N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3ODUxMDIsImV4cCI6MjA1NTM2MTEwMn0.jB5wHcjRqSOb0WHy0yIdKnKIKCsIbUibSY97QCZQ5MU'

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
  latitude: number | null
  longitude: number | null
  original_price: number | null
  price_drop_amount: number | null
  beach_distance_km: number | null
  motivation_score: number | null
  status: string
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
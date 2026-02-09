import { createClient } from '@supabase/supabase-js'

// Next.js reikalauja, kad kintamieji būtų pasiekiami tiesiogiai per process.env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Griežta patikra: jei trūksta duomenų, iškart stabdome procesą su aiškia žinute
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL arba Anon Key nerasti! Įsitikink, kad .env.local failas užkrautas.')
}

// Sukuriame klientą tiesiogiai
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
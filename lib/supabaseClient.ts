import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Pasiimame kintamuosius iš .env.local failo
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Patikra, ar raktai nepasimetė
if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== 'undefined') {
    console.warn('Supabase aplinkos kintamieji nerasti! Patikrink .env.local failą.')
  }
}

let supabaseInstance: SupabaseClient | null = null

const createSupabaseClient = () => {
  if (supabaseUrl && supabaseAnonKey) {
    return createClient(supabaseUrl, supabaseAnonKey)
  }
  return null
}

if (typeof window !== 'undefined') {
  // Naršyklės aplinkoje (Client-side)
  // Naudojame globalų kintamąjį, kad išvengtume dubliavimo programos atnaujinimo metu (HMR)
  if (!(globalThis as any).__supabase) {
    (globalThis as any).__supabase = createSupabaseClient()
  }
  supabaseInstance = (globalThis as any).__supabase
} else {
  // Serverio aplinkoje (Server-side)
  // Kiekvieną kartą sukuriamas švarus klientas
  supabaseInstance = createSupabaseClient()
}

// Eksportuojame modulį naudojant ES Modules standartą
export const supabase = supabaseInstance as SupabaseClient

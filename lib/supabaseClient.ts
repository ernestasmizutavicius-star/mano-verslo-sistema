import { createClient } from '@supabase/supabase-js'

// Naudojame placeholder reikšmes build metu
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Tikriname kintamuosius tik tada, kai kodas veikia vartotojo naršyklėje
if (typeof window !== 'undefined' && (supabaseUrl === 'https://placeholder.supabase.co' || supabaseAnonKey === 'placeholder-key')) {
  console.error('⚠️ Supabase raktai nerasti! Patikrink Vercel nustatymus.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
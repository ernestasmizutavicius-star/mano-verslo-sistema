import { createClient } from '@supabase/supabase-js'

// Naudojame tuščią tekstą kaip atsarginį variantą, kad build procesas nesugriūtų
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Tikriname kintamuosius tik tada, kai kodas veikia vartotojo naršyklėje
if (typeof window !== 'undefined' && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn('⚠️ Supabase raktai nerasti! Patikrink Vercel nustatymus.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Tikriname tik tada, kai programa jau veikia naršyklėje
if (typeof window !== 'undefined' && (!supabaseUrl || !supabaseAnonKey)) {
  console.error('⚠️ Supabase raktai nerasti! Patikrink Vercel nustatymus.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
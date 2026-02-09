import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not set. Check .env.local or NEXT_PUBLIC_* vars.')
}

let supabase
if (typeof window !== 'undefined') {
  // In browser - create a client that can be reused across HMR in dev
  if (!globalThis.__supabase) {
    globalThis.__supabase = createClient(supabaseUrl, supabaseAnonKey)
  }
  supabase = globalThis.__supabase
} else {
  // On server create a fresh client
  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export default supabase

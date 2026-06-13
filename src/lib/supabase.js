// Single shared Supabase client (mirrors EPC). Imported everywhere; created once.
// Reads the anon/public key only — safe for the browser bundle. The service-role
// key NEVER lives in client code (Edge Function secret only).
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loud in dev, but never print the values themselves.
  throw new Error(
    'Missing Supabase env vars. Copy .env.example to .env and set ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias. ' +
    'Crie um arquivo .env baseado no .env.example'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Supabase gerencia a sessão via cookie seguro
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export default supabase

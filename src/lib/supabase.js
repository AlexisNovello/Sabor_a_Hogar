import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const clavePublica = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !clavePublica) {
  throw new Error('Falta configurar la URL o la clave pública de Supabase')
}

export const supabase = createClient(url, clavePublica)
import { supabase } from '../lib/supabase.js'

export async function obtenerProductos() {
  const { data, error } = await supabase
    .from('producto')
    .select('*')
    .limit(20)

  if (error) {
    throw error
  }

  return data
}
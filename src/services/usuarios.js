import { supabase } from "../lib/supabase.js";

// traemos los usuarios ordenados por apellido y nombre
export async function obtenerUsuarios() {
  const { data, error } = await supabase
    .from("usuario")
    .select("dni, nombre, apellido, email, telefono, direccion, rol, bloqueado")
    .order("apellido", { ascending: true })
    .order("nombre", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

// actualiza el bloqueo de una cuenta de cliente
export async function actualizarBloqueo(dni, bloqueado) {
  const { data, error } = await supabase
    .from("usuario")
    .update({ bloqueado: bloqueado })
    .eq("dni", dni)
    .eq("rol", "cliente")
    .select("dni, bloqueado")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

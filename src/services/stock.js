import { supabase } from "../lib/supabase.js";

// traemos los ingredientes ordenados por nombre
export async function obtenerStock() {
  const { data, error } = await supabase
    .from("stock")
    .select("id_ingrediente, nombre, unidad_medida, cantidad_stock")
    .order("nombre", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

// guarda un ingrediente nuevo en Supabase
export async function agregarIngrediente(nombre, unidad, cantidad) {
  const { error } = await supabase.from("stock").insert({
    nombre: nombre,
    unidad_medida: unidad,
    cantidad_stock: cantidad,
  });

  if (error) {
    throw error;
  }
}

// actualiza la cantidad de un ingrediente
export async function actualizarCantidad(
  idIngrediente,
  cantidadActual,
  nuevaCantidad,
) {
  const { data, error } = await supabase
    .from("stock")
    .update({ cantidad_stock: nuevaCantidad })
    .eq("id_ingrediente", idIngrediente)
    .eq("cantidad_stock", cantidadActual)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

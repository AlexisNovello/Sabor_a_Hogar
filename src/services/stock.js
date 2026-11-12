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

// actualiza el nombre sin modificar el stock ni las recetas
export async function actualizarNombreIngrediente(idIngrediente, nombre) {
  const nuevoNombre = nombre.trim();

  if (nuevoNombre === "") {
    throw new Error("Ingresá el nombre del ingrediente.");
  }

  const { data, error } = await supabase
    .from("stock")
    .update({ nombre: nuevoNombre })
    .eq("id_ingrediente", idIngrediente)
    .select("id_ingrediente, nombre")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// elimina un ingrediente que no esté utilizado en recetas
export async function eliminarIngrediente(idIngrediente) {
  const { data, error } = await supabase
    .from("stock")
    .delete()
    .eq("id_ingrediente", idIngrediente)
    .select("id_ingrediente")
    .single();

  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "El ingrediente está relacionado con otros datos. Quitalo primero de las recetas que lo utilizan.",
      );
    }

    throw error;
  }

  return data;
}

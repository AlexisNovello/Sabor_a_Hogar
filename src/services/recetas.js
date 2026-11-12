import { supabase } from "../lib/supabase.js";

// trae los ingredientes de la receta de un plato
export async function obtenerReceta(idProducto) {
  const { data, error } = await supabase
    .from("receta")
    .select("id_receta, id_producto, id_ingrediente, cantidad_necesaria")
    .eq("id_producto", idProducto)
    .order("id_receta", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

// comprueba la cantidad necesaria por porción
function validarCantidad(cantidad) {
  const numero = Number(cantidad);
  const centesimas = numero * 100;

  if (
    !Number.isFinite(numero) ||
    numero <= 0 ||
    numero > 99999999.99 ||
    Math.abs(centesimas - Math.round(centesimas)) > 0.000001
  ) {
    throw new Error(
      "Ingresá una cantidad mayor que cero, con hasta dos decimales y un máximo de 99999999.99.",
    );
  }

  return numero;
}

// agrega un ingrediente a la receta del plato
export async function agregarIngredienteReceta(
  idProducto,
  idIngrediente,
  cantidad,
) {
  const cantidadNecesaria = validarCantidad(cantidad);

  const { data, error } = await supabase
    .from("receta")
    .insert({
      id_producto: idProducto,
      id_ingrediente: idIngrediente,
      cantidad_necesaria: cantidadNecesaria,
    })
    .select("id_receta, id_producto, id_ingrediente, cantidad_necesaria")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// modifica la cantidad de un ingrediente de la receta
export async function actualizarCantidadReceta(idProducto, idReceta, cantidad) {
  const cantidadNecesaria = validarCantidad(cantidad);

  const { data, error } = await supabase
    .from("receta")
    .update({ cantidad_necesaria: cantidadNecesaria })
    .eq("id_producto", idProducto)
    .eq("id_receta", idReceta)
    .select("id_receta, id_producto, id_ingrediente, cantidad_necesaria")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// quita el ingrediente de esta receta, sin eliminarlo del stock
export async function quitarIngredienteReceta(idProducto, idReceta) {
  const { data, error } = await supabase
    .from("receta")
    .delete()
    .eq("id_producto", idProducto)
    .eq("id_receta", idReceta)
    .select("id_receta")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

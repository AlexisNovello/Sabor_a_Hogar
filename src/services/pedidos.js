import { supabase } from "../lib/supabase.js";

export async function crearPedido(carrito) {
  //enviamos solamente los identificadores y las cantidades
  const productos = carrito.map((producto) => ({
    id_producto: producto.id_producto,
    cantidad: producto.cantidad,
  }));

  const { data, error } = await supabase.rpc("crear_pedido", {
    productos,
  });

  if (error) {
    throw error;
  }

  return data; //numero del pedido creado
}
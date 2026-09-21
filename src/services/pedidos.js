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

// traemos los pedidos ordenados por fecha de llegada
export async function obtenerPedidos() {
  const { data, error } = await supabase
    .from("pedido")
    .select(
      `
        id_pedido,
        fecha_hora,
        estado_pedido,
        detalle_pedido (
          cantidad,
          producto (
            nombre
          )
        )
      `,
    )
    .in("estado_pedido", ["Pendiente", "En preparación"]) // trae solo los pendientes / en preparacion
    .order("fecha_hora", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

// actualiza el estado del pedido
export async function actualizarEstadoPedido(idPedido, nuevoEstado) {
  const { data, error } = await supabase
    .from("pedido")
    .update({ estado_pedido: nuevoEstado })
    .eq("id_pedido", idPedido)
    .select("id_pedido, estado_pedido")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

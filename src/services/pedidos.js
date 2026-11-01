import { supabase } from "../lib/supabase.js";
import { obtenerUsuarioActual, exigirRolCocina } from "./auth.js";

export async function crearPedido(carrito) {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) {
    const error = new Error("Iniciá sesión para confirmar tu pedido.");
    error.code = "AUTH_REQUIRED";
    throw error;
  }
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
  await exigirRolCocina();
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
  await exigirRolCocina();
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

// Consulta únicamente los pedidos del perfil vinculado a la cuenta autenticada.
export async function obtenerMisPedidos() {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) {
    const error = new Error('Iniciá sesión para ver tus pedidos.');
    error.code = 'AUTH_REQUIRED';
    throw error;
  }
  const { data: perfil, error: errorPerfil } = await supabase
    .from('usuario').select('dni').eq('auth_user_id', usuario.id).maybeSingle();
  if (errorPerfil) throw errorPerfil;
  if (perfil?.dni == null) throw new Error('No se encontró el perfil de tu cuenta.');
  const { data, error } = await supabase.from('pedido')
    .select('id_pedido, fecha_hora, estado_pedido, detalle_pedido(cantidad, producto(nombre))')
    .eq('dni', perfil.dni)
    .in('estado_pedido', ['Pendiente', 'En preparación', 'Listo'])
    .order('fecha_hora', { ascending: false });
  if (error) throw error;
  return data;
}

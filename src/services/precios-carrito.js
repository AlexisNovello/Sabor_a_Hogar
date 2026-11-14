import { supabase } from '../lib/supabase.js'

// Consulta directa: no utiliza la caché de la carta ni precios del navegador.
export async function actualizarPreciosCarrito(carrito) {
  if (!carrito.length) return false
  const ids = [...new Set(carrito.map(item => item.id_producto))]
  const precios = new Map()
  for (let desde = 0; desde < ids.length; desde += 100) {
    const { data, error } = await supabase.from('producto')
      .select('id_producto, precio').in('id_producto', ids.slice(desde, desde + 100))
    if (error) throw error
    for (const producto of data) precios.set(String(producto.id_producto), producto.precio)
  }
  // Valida todo antes de modificar el carrito para evitar actualizaciones parciales.
  for (const item of carrito) {
    const precio = precios.get(String(item.id_producto))
    if (precio == null || !Number.isFinite(Number(precio)) || Number(precio) <= 0) {
      throw new Error('No se pudo verificar el precio de todos los productos.')
    }
  }
  let cambios = false
  for (const item of carrito) {
    const precio = Number(precios.get(String(item.id_producto)))
    if (Number(item.precio) !== precio) cambios = true
    item.precio = precio
  }
  return cambios
}

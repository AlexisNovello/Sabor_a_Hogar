import { supabase } from "../lib/supabase.js";

// Obtiene la carta completa por lotes para no depender del límite de una consulta.
export async function obtenerTodosLosProductos() {
  const productos = [];
  const tamanoLote = 500;
  for (let desde = 0; ; desde += tamanoLote) {
    const { data, error } = await supabase
      .from("producto")
      .select("*")
      .order("id_producto", { ascending: true })
      .range(desde, desde + tamanoLote - 1);
    if (error) throw error;
    productos.push(...data);
    if (data.length < tamanoLote) return productos;
  }
}

// trae todos los productos para mostrar en la carta
export async function obtenerProductos() {
  return obtenerTodosLosProductos();
}

export async function obtenerProducto(id) {
  const { data, error } = await supabase
    .from("producto")
    .select("*")
    .eq("id_producto", id)
    .single();
  if (error) throw error;
  return data;
}

export function validarProducto(datos) {
  const nombre = datos.nombre.trim();
  const descripcion = datos.descripcion.trim();
  const precio = Number(datos.precio);
  const foto = datos.foto?.trim() || null;
  if (!nombre || nombre.length > 150)
    throw new Error("Ingresá un nombre de hasta 150 caracteres.");
  if (!descripcion || descripcion.length > 2000)
    throw new Error("Ingresá una descripción de hasta 2000 caracteres.");
  if (
    !Number.isFinite(precio) ||
    precio <= 0 ||
    Math.abs(precio * 100 - Math.round(precio * 100)) > 0.000001
  ) {
    throw new Error("Ingresá un precio mayor a cero, con hasta dos decimales.");
  }
  if (foto) {
    let url;
    try {
      url = new URL(foto);
    } catch {
      throw new Error("Ingresá una URL válida para la imagen.");
    }
    if (!["https:", "http:"].includes(url.protocol))
      throw new Error("La imagen debe usar una URL HTTP o HTTPS.");
  }
  return { nombre, descripcion, precio, foto };
}

export function validarImagen(archivo) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type))
    throw new Error("Usá una imagen JPG, PNG o WebP.");
  if (archivo.size > 5 * 1024 * 1024)
    throw new Error("La imagen no puede superar los 5 MB.");
}

export async function guardarProducto(
  datos,
  id = null,
  { archivo, bucket } = {},
) {
  const producto = validarProducto(datos);
  let rutaSubida;
  if (archivo) {
    validarImagen(archivo);
    if (!bucket)
      throw new Error(
        "La subida de archivos no está configurada. Usá una URL de imagen.",
      );
    const extension = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    }[archivo.type];
    rutaSubida = crypto.randomUUID() + "." + extension;
    const { error } = await supabase.storage
      .from(bucket)
      .upload(rutaSubida, archivo, {
        contentType: archivo.type,
        upsert: false,
      });
    if (error)
      throw new Error(
        "No se pudo subir la imagen. Revisá el bucket y sus permisos. " +
          error.message,
      );
    producto.foto = supabase.storage
      .from(bucket)
      .getPublicUrl(rutaSubida).data.publicUrl;
  }
  try {
    // Al editar se conservan el estado y las demás columnas del producto.
    const consulta =
      id === null
        ? supabase
            .from("producto")
            .insert({ ...producto, estado: "disponible" })
        : supabase.from("producto").update(producto).eq("id_producto", id);
    const { data, error } = await consulta.select("id_producto").single();
    if (error) throw error;
    return data;
  } catch (error) {
    // Sólo elimina el archivo nuevo si no pudo guardarse el producto; conserva la foto anterior.
    if (rutaSubida) {
      try {
        const { error: errorLimpieza } = await supabase.storage
          .from(bucket)
          .remove([rutaSubida]);
        if (errorLimpieza)
          console.error(
            "No se pudo limpiar la imagen sin producto:",
            errorLimpieza,
          );
      } catch (errorLimpieza) {
        console.error(
          "No se pudo limpiar la imagen sin producto:",
          errorLimpieza,
        );
      }
    }
    throw error;
  }
}

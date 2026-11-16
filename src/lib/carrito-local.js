// Los datos del navegador son una copia local; el servidor verifica el pedido.
const clave = 'carrito';
const maximoEntero = 2147483647;

// No convierte booleanos, objetos ni valores vacíos en números válidos.
function numero(valor) {
  return typeof valor === 'number' || (typeof valor === 'string' && valor.trim() !== '')
    ? Number(valor) : NaN;
}

export function guardarCarrito(carrito) {
  try {
    localStorage.setItem(clave, JSON.stringify(carrito));
    return true;
  } catch { return false; }
}

export function vaciarCarrito() {
  try { localStorage.removeItem(clave); } catch {
    // Si no se puede borrar, intenta reemplazar el contenido por un carrito vacío.
    guardarCarrito([]);
  }
}

export function leerCarrito() {
  let contenido;
  try { contenido = localStorage.getItem(clave); } catch { return []; }
  if (contenido == null) return [];
  let datos;
  try { datos = JSON.parse(contenido); } catch {
    vaciarCarrito();
    return [];
  }
  if (!Array.isArray(datos)) {
    vaciarCarrito();
    return [];
  }
  const productos = new Map();
  for (const item of datos) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const id = numero(item.id_producto);
    const cantidad = numero(item.cantidad);
    const precio = numero(item.precio);
    if (!Number.isInteger(id) || id < 1 || id > maximoEntero ||
        !Number.isInteger(cantidad) || cantidad < 1 || cantidad > maximoEntero ||
        !Number.isFinite(precio) || precio < 0 || precio > 99999999.99) continue;
    const anterior = productos.get(id);
    if (anterior) {
      // Agrupa duplicados sin producir una cantidad fuera del rango del servidor.
      if (anterior.cantidad + cantidad <= maximoEntero) anterior.cantidad += cantidad;
      continue;
    }
    productos.set(id, {
      id_producto: id,
      cantidad,
      precio,
      nombre: typeof item.nombre === 'string' ? item.nombre : 'Producto',
      descripcion: typeof item.descripcion === 'string' ? item.descripcion : '',
      foto: typeof item.foto === 'string' ? item.foto : '',
    });
  }
  const carrito = [...productos.values()];
  // Repara únicamente esta clave; no borra sesiones ni otros datos del navegador.
  if (JSON.stringify(carrito) !== contenido) guardarCarrito(carrito);
  return carrito;
}

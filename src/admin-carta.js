import { obtenerTodosLosProductos } from './services/productos.js'

const lista = document.querySelector('#lista-carta-admin')
const plantilla = document.querySelector('#plantilla-item-carta-admin')
const mensaje = document.querySelector('#mensaje-carta')
const formatoPrecio = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

async function cargarCarta() {
  try {
    const productos = await obtenerTodosLosProductos()
    for (const producto of productos) {
      const copia = plantilla.content.cloneNode(true)
      copia.querySelector('[data-nombre]').textContent = producto.nombre
      copia.querySelector('[data-precio]').textContent = formatoPrecio.format(producto.precio)
      copia.querySelector('[data-editar]').href = 'admin-plato.html?id=' + encodeURIComponent(producto.id_producto)
      const foto = copia.querySelector('[data-foto]')
      const sinFoto = copia.querySelector('[data-sin-foto]')
      const mostrarSinFoto = () => {
        foto.classList.add('hidden')
        sinFoto.classList.remove('hidden')
        sinFoto.classList.add('flex')
      }
      foto.alt = producto.nombre
      foto.addEventListener('error', mostrarSinFoto, { once: true })
      if (producto.foto?.trim()) foto.src = producto.foto
      else mostrarSinFoto()
      lista.append(copia)
    }
    mensaje.textContent = productos.length ? '' : 'Todavía no hay productos en la carta.'
  } catch (error) {
    console.error('No se pudo cargar la carta:', error)
    mensaje.textContent = 'No se pudo cargar la carta. Recargá la página para intentar nuevamente.'
  }
}

cargarCarta()

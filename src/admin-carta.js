import { obtenerTodosLosProductos, actualizarPublicacionProducto } from './services/productos.js'

const lista = document.querySelector('#lista-carta-admin')
const plantilla = document.querySelector('#plantilla-item-carta-admin')
const mensaje = document.querySelector('#mensaje-carta')
const formatoPrecio = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

async function cargarCarta() {
  try {
    const productos = await obtenerTodosLosProductos()
    lista.replaceChildren()
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

      const publicacion = copia.querySelector('[data-publicacion]')
      const botonPublicacion = copia.querySelector('[data-cambiar-publicacion]')
      let guardando = false

      // indica si el plato está publicado o retirado
      function actualizarBoton() {
        const retirado = producto.estado === 'oculto'
        publicacion.textContent = retirado ? 'Retirado de la carta' : 'Publicado en la carta'
        publicacion.classList.toggle('text-gray-600', retirado)
        publicacion.classList.toggle('text-green-800', !retirado)
        botonPublicacion.textContent = retirado ? 'Volver a publicar' : 'Retirar de la carta'
      }

      actualizarBoton()

      // conserva el plato, sus recetas y los pedidos que lo utilizan
      botonPublicacion.addEventListener('click', async () => {
        if (guardando) return
        const retirado = producto.estado === 'oculto'
        const confirmar = window.confirm(retirado
          ? `¿Querés volver a publicar ${producto.nombre}?`
          : `¿Querés retirar ${producto.nombre} de la carta?`)
        if (!confirmar) return

        guardando = true
        botonPublicacion.disabled = true
        botonPublicacion.textContent = 'Guardando...'

        try {
          const actualizado = await actualizarPublicacionProducto(
            producto.id_producto, retirado ? 'disponible' : 'oculto',
          )
          producto.estado = actualizado.estado
        } catch (error) {
          console.error('Error al cambiar la publicación:', error)
          alert('No se pudo cambiar la publicación. Intentá nuevamente.')
        } finally {
          guardando = false
          botonPublicacion.disabled = false
          actualizarBoton()
        }
      })

      lista.append(copia)
    }
    mensaje.textContent = productos.length ? '' : 'Todavía no hay productos en la carta.'
  } catch (error) {
    console.error('No se pudo cargar la carta:', error)
    mensaje.textContent = 'No se pudo cargar la carta. Recargá la página para intentar nuevamente.'
  }
}

cargarCarta()

import { obtenerMisPedidos } from './services/pedidos.js'
import { irAlLogin } from './lib/destino-login.js'
import { supabase } from './lib/supabase.js'

const lista = document.querySelector('#lista-mis-pedidos')
const plantilla = document.querySelector('#plantilla-mi-pedido')
const mensaje = document.querySelector('#mensaje-pedidos')
const actualizar = document.querySelector('#actualizar-pedidos')
const ingresar = document.querySelector('#ingresar-pedidos')
let version = 0
const fecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' })

async function cargar() {
  const solicitud = ++version
  actualizar.disabled = true
  ingresar.classList.add('hidden')
  ingresar.classList.remove('inline-block')
  lista.replaceChildren()
  mensaje.textContent = 'Cargando tus pedidos...'
  try {
    const pedidos = await obtenerMisPedidos()
    if (solicitud !== version) return
    for (const pedido of pedidos) {
      const copia = plantilla.content.cloneNode(true)
      copia.querySelector('[data-numero]').textContent = 'Pedido n.º ' + pedido.id_pedido
      const fechaPedido = new Date(pedido.fecha_hora)
      copia.querySelector('[data-fecha]').textContent = Number.isNaN(fechaPedido.getTime()) ? '' : fecha.format(fechaPedido)
      const estado = copia.querySelector('[data-estado]')
      estado.textContent = pedido.estado_pedido === 'Listo' ? 'Listo para retirar' : pedido.estado_pedido
      const colores = pedido.estado_pedido === 'Listo' ? ['bg-green-100', 'text-green-800']
        : pedido.estado_pedido === 'En preparación' ? ['bg-blue-100', 'text-blue-800'] : ['bg-yellow-100', 'text-yellow-800']
      estado.classList.add(...colores)
      for (const detalle of pedido.detalle_pedido || []) {
        const item = document.createElement('li')
        item.textContent = detalle.cantidad + ' × ' + (detalle.producto?.nombre || 'Producto no disponible')
        copia.querySelector('[data-productos]').append(item)
      }
      lista.append(copia)
    }
    mensaje.textContent = pedidos.length ? '' : 'No tenés pedidos pendientes.'
  } catch (error) {
    if (solicitud !== version) return
    if (error.code === 'AUTH_REQUIRED') {
      mensaje.textContent = 'Iniciá sesión para consultar tus pedidos.'
      ingresar.classList.remove('hidden')
      ingresar.classList.add('inline-block')
    } else {
      console.error('No se pudieron cargar tus pedidos:', error)
      mensaje.textContent = 'No se pudieron cargar tus pedidos. Intentá actualizar nuevamente.'
    }
  } finally {
    if (solicitud === version) actualizar.disabled = false
  }
}
ingresar.addEventListener('click', (evento) => {
  evento.preventDefault()
  irAlLogin('/mis-pedidos.html')
})
actualizar.addEventListener('click', cargar)
// Limpia los pedidos al cambiar o cerrar la cuenta en otra pestaña.
supabase.auth.onAuthStateChange(() => {
  ++version
  lista.replaceChildren()
  setTimeout(cargar, 0)
})
cargar()

import { cerrarSesion, obtenerSesion, obtenerRolUsuario } from '../services/auth.js'
import { supabase } from '../lib/supabase.js'

const enlaceLogin = document.querySelector('#enlace-login')
const enlaceMisPedidos = document.querySelector('#enlace-mis-pedidos')
const datosSesion = document.querySelector('#datos-sesion')
const nombreUsuario = document.querySelector('#nombre-usuario')
const botonCerrarSesion = document.querySelector('#boton-cerrar-sesion')
const mensaje = document.querySelector('#mensaje-sesion')
const enlaceAdmin = document.querySelector('#enlace-admin')
const enlaceCocina = document.querySelector('#enlace-cocina')
let versionSesion = 0

async function cargarAccesoAdmin(sesion, version) {
  try {
    const rol = await obtenerRolUsuario(sesion.user.id)
    // Ignora respuestas de una sesión anterior, por ejemplo al cerrar sesión.
    if (version === versionSesion) {
      enlaceAdmin.classList.toggle('hidden', rol !== 'admin')
      enlaceCocina.classList.toggle('hidden', rol !== 'cocina')
    }
  } catch (error) {
    console.error('No se pudo consultar el rol:', error)
    if (version === versionSesion) enlaceAdmin.classList.add('hidden')
  }
}

function mostrarSesion(sesion) {
  const version = ++versionSesion
  enlaceAdmin.classList.add('hidden')
  enlaceCocina.classList.add('hidden')
  // Consulta fuera del callback de Auth para evitar bloquear sus operaciones.
  if (sesion) setTimeout(() => cargarAccesoAdmin(sesion, version), 0)
  enlaceMisPedidos.classList.toggle('hidden', !sesion)
  enlaceMisPedidos.classList.toggle('inline-flex', Boolean(sesion))
  enlaceLogin.classList.toggle('hidden', Boolean(sesion))
  enlaceLogin.classList.toggle('inline-flex', !sesion)
  datosSesion.classList.toggle('hidden', !sesion)
  datosSesion.classList.toggle('flex', Boolean(sesion))
  nombreUsuario.textContent = sesion
    ? (sesion.user.user_metadata?.nombre
      ? 'Hola, ' + sesion.user.user_metadata.nombre.trim().replace(/^./u, letra => letra.toLocaleUpperCase('es-AR'))
      : 'Cuenta: ' + sesion.user.email)
    : ''
}

// Actualiza también cuando la sesión cambia en otra pestaña o vence.
supabase.auth.onAuthStateChange((_evento, sesion) => mostrarSesion(sesion))
obtenerSesion().then(mostrarSesion).catch((error) => {
  console.error('No se pudo consultar la sesión:', error)
  mensaje.textContent = 'No se pudo consultar tu sesión. Intentá ingresar nuevamente.'
  mostrarSesion(null)
})

botonCerrarSesion.addEventListener('click', async () => {
  botonCerrarSesion.disabled = true
  mensaje.textContent = ''
  try {
    await cerrarSesion()
    mostrarSesion(null)
  } catch (error) {
    console.error('No se pudo cerrar la sesión:', error)
    mensaje.textContent = 'No se pudo cerrar la sesión. Intentá nuevamente.'
  } finally {
    botonCerrarSesion.disabled = false
  }
})

// Cargamos Tailwind y los estilos generales.
import '../style.css'

// Importamos solamente las operaciones de autenticación necesarias.
import { iniciarSesion, obtenerUsuarioActual } from '../services/auth.js'
import { continuarDespuesDelLogin } from '../lib/destino-login.js'

// Buscamos el formulario y sus elementos.
const formularioLogin = document.querySelector('#formulario-login')
const email = document.querySelector('#email')
const password = document.querySelector('#password')
const botonLogin = document.querySelector('#boton-login')
const mensajeLogin = document.querySelector('#mensaje-login')

/**
 * Muestra un mensaje debajo del botón.
 *
 * Puede mostrar:
 * - Un error en rojo.
 * - Una confirmación en verde.
 */
function mostrarMensaje(texto, tipo = 'error') {
  mensajeLogin.textContent = texto

  mensajeLogin.classList.remove(
    'hidden',
    'bg-red-100',
    'text-red-700',
    'bg-green-100',
    'text-green-700',
  )

  if (tipo === 'exito') {
    mensajeLogin.classList.add('bg-green-100', 'text-green-700')
  } else {
    mensajeLogin.classList.add('bg-red-100', 'text-red-700')
  }
}

/**
 * Cambia el mensaje técnico de Supabase por uno
 * que resulte más claro para el usuario.
 */
function traducirError(error) {
  const mensaje = error.message.toLowerCase()

  if (mensaje.includes('invalid login credentials')) {
    return 'El correo o la contraseña son incorrectos.'
  }

  if (mensaje.includes('email not confirmed')) {
    return 'Primero tenés que confirmar tu correo electrónico.'
  }

  return `No se pudo iniciar sesión: ${error.message}`
}

/**
 * Procesa el formulario cuando el usuario presiona "Ingresar".
 */
formularioLogin.addEventListener('submit', async (evento) => {
  // Evitamos que el navegador recargue la página.
  evento.preventDefault()
  if (botonLogin.disabled) return

  // El navegador comprueba el formato del correo.
  if (!email.validity.valid) {
    mostrarMensaje('Ingresá un correo electrónico válido.')
    email.focus()
    return
  }

  if (!password.value) {
    mostrarMensaje('Ingresá tu contraseña.')
    password.focus()
    return
  }

  // Evitamos que el usuario envíe varias solicitudes al mismo tiempo.
  botonLogin.disabled = true
  botonLogin.textContent = 'Ingresando...'

  try {
    // Enviamos las credenciales a Supabase Auth.
    const resultado = await iniciarSesion(
      email.value.trim().toLowerCase(),
      password.value,
    )

    if (!resultado.session) {
      throw new Error('Supabase no devolvió una sesión.')
    }

    continuarDespuesDelLogin()
  } catch (error) {
    mostrarMensaje(traducirError(error))
  } finally {
    // Reactivamos el botón tanto si funciona como si falla.
    botonLogin.disabled = false
    botonLogin.textContent = 'Ingresar'
  }
})

/**
 * Si el usuario ya tiene una sesión activa y visita login.html,
 * lo enviamos directamente a la carta.
 */
async function redirigirSiYaIngreso() {
  try {
    const sesion = await obtenerUsuarioActual()

    if (sesion) {
      // También respetamos el destino si la sesión ya existía.
      continuarDespuesDelLogin()
    }
  } catch (error) {
    // Si falla esta consulta, dejamos visible el formulario.
    console.error('No se pudo comprobar la sesión:', error)
  }
}

// Ejecutamos la comprobación cuando se carga la pantalla.
redirigirSiYaIngreso()

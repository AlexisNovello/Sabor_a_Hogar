// Importamos las operaciones de sesión que ya creamos en auth.js.
import { cerrarSesion, obtenerSesion } from '../services/auth.js'

// Buscamos los elementos del encabezado.
const enlaceLogin = document.querySelector('#enlace-login')
const datosSesion = document.querySelector('#datos-sesion')
const nombreUsuario = document.querySelector('#nombre-usuario')
const botonCerrarSesion = document.querySelector('#boton-cerrar-sesion')

/**
 * Muestra el encabezado correspondiente a un visitante.
 */
function mostrarVisitante() {
  // Mostramos el enlace para ingresar.
  enlaceLogin.classList.remove('hidden')

  // Ocultamos los datos y el botón de cierre de sesión.
  datosSesion.classList.add('hidden')
  datosSesion.classList.remove('flex')
}

/**
 * Muestra el encabezado correspondiente a un usuario autenticado.
 */
function mostrarUsuario(sesion) {
  // Ocultamos el enlace de ingreso.
  enlaceLogin.classList.add('hidden')

  // Mostramos el contenedor de la sesión.
  datosSesion.classList.remove('hidden')
  datosSesion.classList.add('flex')

  /*
   * Los datos personales enviados durante el registro
   * están disponibles dentro de user_metadata.
   */
  const nombre = sesion.user.user_metadata.nombre

  // Si no encontramos el nombre, mostramos el correo como alternativa.
  nombreUsuario.textContent = nombre
    ? `Hola, ${nombre}`
    : sesion.user.email
}

/**
 * Consulta si existe una sesión al cargar la carta.
 */
async function cargarSesion() {
  try {
    const sesion = await obtenerSesion()

    if (sesion) {
      mostrarUsuario(sesion)
    } else {
      mostrarVisitante()
    }
  } catch (error) {
    /*
     * Si ocurre un error al consultar Supabase, dejamos la carta pública
     * y tratamos al usuario como visitante.
     */
    console.error('No se pudo consultar la sesión:', error)
    mostrarVisitante()
  }
}

/**
 * Cierra la sesión cuando se presiona el botón.
 */
botonCerrarSesion.addEventListener('click', async () => {
  botonCerrarSesion.disabled = true
  botonCerrarSesion.textContent = 'Cerrando...'

  try {
    // Supabase elimina la sesión guardada en este navegador.
    await cerrarSesion()

    // Actualizamos el encabezado sin necesidad de recargar la página.
    mostrarVisitante()
  } catch (error) {
    console.error('No se pudo cerrar la sesión:', error)
  } finally {
    botonCerrarSesion.disabled = false
    botonCerrarSesion.textContent = 'Cerrar sesión'
  }
})

// Consultamos la sesión cuando el archivo termina de cargar.
cargarSesion()
// Importamos los estilos generales del proyecto.
import '../style.css'

// Importamos la función que se comunica con Supabase Auth.
import { registrarCliente } from '../services/auth.js'

// Buscamos las dos partes del formulario.
const pasoDatos = document.querySelector('#paso-datos')
const pasoDireccion = document.querySelector('#paso-direccion')

// Buscamos los botones que permiten cambiar de etapa.
const botonSiguiente = document.querySelector('#boton-siguiente')
const botonVolver = document.querySelector('#boton-volver')

// Este elemento mostrará errores o avisos al usuario.
const mensajeRegistro = document.querySelector('#mensaje-registro')

// Guardamos los campos de la primera etapa para validarlos.
const nombre = document.querySelector('#nombre')
const apellido = document.querySelector('#apellido')
const email = document.querySelector('#email')
const dni = document.querySelector('#dni')
const telefono = document.querySelector('#telefono')
const password = document.querySelector('#password')
const repetirPassword = document.querySelector('#repetir-password')

// Buscamos el formulario completo.
const formularioRegistro = document.querySelector('#formulario-registro')

// Buscamos los campos correspondientes a la dirección.
const calle = document.querySelector('#calle')
const altura = document.querySelector('#altura')
const piso = document.querySelector('#piso')
const referencia = document.querySelector('#referencia')

// Buscamos el botón para poder desactivarlo mientras Supabase responde.
const botonRegistrarse = document.querySelector('#boton-registrarse')

/**
 * Muestra un mensaje debajo del formulario.
 *
 * El parámetro "tipo" puede ser:
 * - "error": muestra el mensaje en rojo.
 * - "exito": muestra el mensaje en verde.
 */
function mostrarMensaje(texto, tipo = 'error') {
  mensajeRegistro.textContent = texto
  mensajeRegistro.classList.remove(
    'hidden',
    'bg-red-100',
    'text-red-700',
    'bg-green-100',
    'text-green-700',
  )

  if (tipo === 'exito') {
    mensajeRegistro.classList.add('bg-green-100', 'text-green-700')
  } else {
    mensajeRegistro.classList.add('bg-red-100', 'text-red-700')
  }
}

/**
 * Oculta cualquier mensaje anterior.
 */
function ocultarMensaje() {
  mensajeRegistro.textContent = ''
  mensajeRegistro.classList.add('hidden')
}

/**
 * Revisa los campos obligatorios de la primera etapa.
 *
 * Devuelve:
 * - true si los datos son válidos.
 * - false si encuentra algún problema.
 */
function validarDatosPersonales() {
  // trim() elimina espacios innecesarios al principio y al final.
  if (nombre.value.trim().length < 2) {
    mostrarMensaje('Ingresá un nombre válido.')
    nombre.focus()
    return false
  }

  if (apellido.value.trim().length < 2) {
    mostrarMensaje('Ingresá un apellido válido.')
    apellido.focus()
    return false
  }

  // El navegador revisa que el correo tenga un formato válido.
  if (!email.validity.valid) {
    mostrarMensaje('Ingresá un correo electrónico válido.')
    email.focus()
    return false
  }

  // Esta expresión permite únicamente DNI de 7 u 8 números.
  const formatoDni = /^\d{7,8}$/

  if (!formatoDni.test(dni.value.trim())) {
    mostrarMensaje('El DNI debe contener 7 u 8 números.')
    dni.focus()
    return false
  }

  /*
   * Eliminamos espacios, guiones y paréntesis antes de revisar el teléfono.
   * De esta manera se aceptan formatos como:
   * 342 123-4567
   * (342) 1234567
   */
  const telefonoLimpio = telefono.value.replace(/[\s()-]/g, '')
  const formatoTelefono = /^\+?\d{8,15}$/

  if (!formatoTelefono.test(telefonoLimpio)) {
    mostrarMensaje('Ingresá un teléfono válido.')
    telefono.focus()
    return false
  }

  if (password.value.length < 8) {
    mostrarMensaje('La contraseña debe tener al menos 8 caracteres.')
    password.focus()
    return false
  }

  if (password.value !== repetirPassword.value) {
    mostrarMensaje('Las contraseñas no coinciden.')
    repetirPassword.focus()
    return false
  }

  return true
}

/**
 * Revisa los campos obligatorios de la dirección.
 */
function validarDireccion() {
  if (calle.value.trim().length < 3) {
    mostrarMensaje('Ingresá una calle válida.')
    calle.focus()
    return false
  }

  // La altura debe contener solamente números.
  const formatoAltura = /^\d+$/

  if (!formatoAltura.test(altura.value.trim())) {
    mostrarMensaje('La altura debe contener solamente números.')
    altura.focus()
    return false
  }

  return true
}

/**
 * Une calle, altura, piso y referencia en un solo texto.
 *
 * Ejemplo:
 * Recreo Sur 1450, Piso/Depto: 3° B, Referencia: portón negro
 */
function construirDireccion() {
  const partesDireccion = [
    `${calle.value.trim()} ${altura.value.trim()}`,
  ]

  // Sólo agregamos piso si el usuario escribió algo.
  if (piso.value.trim()) {
    partesDireccion.push(`Piso/Depto: ${piso.value.trim()}`)
  }

  // Sólo agregamos referencia si el usuario escribió algo.
  if (referencia.value.trim()) {
    partesDireccion.push(`Referencia: ${referencia.value.trim()}`)
  }

  return partesDireccion.join(', ')
}

/**
 * Al presionar "Siguiente", primero validamos los datos.
 * Si son correctos, ocultamos la primera sección y mostramos la dirección.
 */
botonSiguiente.addEventListener('click', () => {
  ocultarMensaje()

  if (!validarDatosPersonales()) {
    return
  }

  pasoDatos.classList.add('hidden')
  pasoDireccion.classList.remove('hidden')

  // Colocamos el cursor directamente en el campo Calle.
  document.querySelector('#calle').focus()
})

/**
 * Permite regresar a la primera etapa.
 * Los valores escritos no se pierden porque ambas secciones
 * pertenecen al mismo formulario.
 */
botonVolver.addEventListener('click', () => {
  ocultarMensaje()

  pasoDireccion.classList.add('hidden')
  pasoDatos.classList.remove('hidden')

  nombre.focus()
})

/**
 * Se ejecuta cuando el usuario presiona "Registrarse".
 */
formularioRegistro.addEventListener('submit', async (evento) => {
  // Evitamos que el navegador recargue la página.
  evento.preventDefault()

  ocultarMensaje()

  // Volvemos a validar los datos personales por seguridad.
  if (!validarDatosPersonales()) {
    pasoDireccion.classList.add('hidden')
    pasoDatos.classList.remove('hidden')
    return
  }

  if (!validarDireccion()) {
    return
  }

  // Desactivamos el botón para evitar registros duplicados.
  botonRegistrarse.disabled = true
  botonRegistrarse.textContent = 'Creando cuenta...'

  try {
    // Preparamos los datos que necesita registrarCliente().
    const datosCliente = {
      nombre: nombre.value.trim(),
      apellido: apellido.value.trim(),
      email: email.value.trim().toLowerCase(),
      dni: dni.value.trim(),

      // Guardamos el teléfono sin espacios, guiones ni paréntesis.
      telefono: telefono.value.replace(/[\s()-]/g, ''),

      password: password.value,
      direccion: construirDireccion(),
    }

    // Enviamos los datos a Supabase Auth.
    const resultado = await registrarCliente(datosCliente)

    if (!resultado.user) {
      throw new Error('Supabase no pudo crear la cuenta.')
    }

    // Si Supabase no devuelve una sesión, normalmente significa
    // que el usuario debe confirmar su correo antes de ingresar.
    if (resultado.session) {
      mostrarMensaje(
        'Cuenta creada correctamente. Ya podés iniciar sesión.',
        'exito',
      )
    } else {
      mostrarMensaje(
        'Cuenta creada. Revisá tu correo para confirmar el registro.',
        'exito',
      )
    }

    // Limpiamos los campos después de crear la cuenta.
    formularioRegistro.reset()

    /*
     * Esperamos dos segundos para que el usuario pueda leer el mensaje
     * y luego lo enviamos a la pantalla de login.
     */
    setTimeout(() => {
      window.location.href = '/login.html'
    }, 2000)
  } catch (error) {
    /*
     * Supabase normalmente devuelve mensajes en inglés.
     * Por ahora mostramos el mensaje original para poder diagnosticar.
     * Más adelante traduciremos los errores más comunes.
     */
    mostrarMensaje(`No se pudo crear la cuenta: ${error.message}`)
  } finally {
    // El bloque finally se ejecuta tanto si funciona como si falla.
    botonRegistrarse.disabled = false
    botonRegistrarse.textContent = 'Registrarse'
  }
})
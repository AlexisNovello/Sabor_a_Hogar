// Importamos el cliente de Supabase que ya está configurado en el proyecto.
import { supabase } from '../lib/supabase.js'

/**
 * Crea una cuenta nueva utilizando Supabase Auth.
 *
 * Supabase Auth guarda de manera segura:
 * - El correo.
 * - La contraseña cifrada.
 *
 * Los demás datos viajan como metadata.
 * El trigger de la base utiliza esa metadata para crear public.usuario.
 */
export async function registrarCliente(datos) {
  // Enviamos la solicitud de registro a Supabase Auth.
  const { data, error } = await supabase.auth.signUp({
    email: datos.email,
    password: datos.password,

    options: {
      data: {
        dni: datos.dni,
        nombre: datos.nombre,
        apellido: datos.apellido,
        telefono: datos.telefono,
        direccion: datos.direccion,
      },
    },
  })

  // Si Supabase devuelve un error, lo lanzamos para manejarlo en registro.js.
  if (error) {
    throw error
  }

  // Retornamos la información de la cuenta creada.
  return data
}

/**
 * Inicia una sesión usando correo y contraseña.
 *
 * Supabase compara estos datos con la información
 * almacenada en Authentication.
 */
export async function iniciarSesion(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  // Si las credenciales son incorrectas, Supabase devuelve un error.
  if (error) {
    throw error
  }

  return data
}

/**
 * Devuelve la sesión guardada actualmente en el navegador.
 *
 * Si no hay una sesión iniciada, data.session será null.
 */
export async function obtenerSesion() {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw error
  }

  return data.session
}

/**
 * Cierra la sesión actual del usuario.
 */
export async function cerrarSesion() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}
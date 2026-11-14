import { supabase } from './supabase.js'

export const mensajeBloqueo = 'Su cuenta ha sido bloqueada. Si considera que se trata de un error, comuníquese con el administrador a través de alexis_novello99@hotmail.com.'
let restringido = false
let comprobando = null
let ultimaRevision = 0
export let perfilActual = null

function mostrarRestriccion(texto) {
  restringido = true
  document.body.replaceChildren()
  const estilo = document.createElement('style')
  estilo.textContent = 'body{visibility:visible!important;margin:0;background:#fff1f2;color:#292524;font:18px/1.6 system-ui;min-height:100vh;display:grid;place-items:center}#aviso-cuenta{margin:24px;padding:32px;max-width:540px;background:white;border:1px solid #fecdd3;border-radius:16px;box-shadow:0 8px 30px #0001}#aviso-cuenta button{padding:12px 24px;border:0;border-radius:8px;background:#b91c1c;color:white;font:inherit;cursor:pointer}#aviso-cuenta button:disabled{opacity:.6}'
  const panel = document.createElement('main')
  panel.id = 'aviso-cuenta'
  const mensaje = document.createElement('p')
  mensaje.textContent = texto
  mensaje.setAttribute('role', 'alert')
  const boton = document.createElement('button')
  boton.textContent = 'Cerrar sesión'
  const errorSalida = document.createElement('p')
  errorSalida.setAttribute('role', 'status')
  boton.addEventListener('click', async () => {
    if (boton.disabled || !window.confirm('¿Querés cerrar sesión?')) return
    boton.disabled = true
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      window.location.replace(import.meta.env.BASE_URL + 'login.html')
    } catch {
      errorSalida.textContent = 'No se pudo cerrar la sesión. Inténtelo nuevamente.'
      boton.disabled = false
    }
  })
  panel.append(mensaje, boton, errorSalida)
  document.body.append(estilo, panel)
}

export function esPaginaAdministrativa(ruta) {
  const pagina = ruta.split('/').pop()
  return pagina === 'administrador.html' || /^admin-[^/]+\.html$/.test(pagina)
}

async function consultarPerfil(administracion) {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  if (!data.session) return null
  const id = data.session.user.id
  // Consulta perfil e identidad en paralelo; ambos deben aprobarse antes del acceso.
  const [resultadoPerfil, identidad] = await Promise.all([
    supabase.from('usuario').select('bloqueado, rol').eq('auth_user_id', id).maybeSingle(),
    administracion ? supabase.auth.getUser() : Promise.resolve(null),
  ])
  if (identidad?.error) throw identidad.error
  if (administracion && identidad?.data?.user?.id !== id) return null
  const { data: perfil, error: errorPerfil } = resultadoPerfil
  if (errorPerfil) throw errorPerfil
  if (!perfil) throw new Error('No se encontró el perfil de la cuenta.')
  return perfil
}

async function comprobar() {
  if (restringido) return false
  try {
    const administracion = esPaginaAdministrativa(window.location.pathname)
    const perfil = await consultarPerfil(administracion)
    perfilActual = perfil
    if (perfil?.bloqueado === true) {
      mostrarRestriccion(mensajeBloqueo)
      return false
    }
    if (administracion && perfil?.rol !== 'admin') {
      // El HTML continúa oculto y los módulos administrativos no se ejecutan.
      window.location.replace(import.meta.env.BASE_URL + 'index.html')
      return false
    }
    document.querySelector('#espera-cuenta')?.remove()
    return true
  } catch (error) {
    console.error('No se pudo verificar el acceso:', error)
    mostrarRestriccion('No se pudo verificar el estado de su cuenta. Cierre la sesión e inténtelo nuevamente.')
    return false
  }
}

function revisar(forzar = false) {
  if (!comprobando && (forzar || Date.now() - ultimaRevision >= 1000)) {
    comprobando = comprobar().finally(() => {
      ultimaRevision = Date.now()
      comprobando = null
    })
  }
  return comprobando
}

export const accesoPermitido = revisar()
// No ejecutar consultas dentro del callback de Auth: puede bloquear el cliente.
supabase.auth.onAuthStateChange((evento) => {
  if (evento !== 'INITIAL_SESSION') setTimeout(() => revisar(true), 0)
})
window.addEventListener('focus', () => revisar())
window.addEventListener('pageshow', (evento) => revisar(evento.persisted === true))
setInterval(() => revisar(), 15000)

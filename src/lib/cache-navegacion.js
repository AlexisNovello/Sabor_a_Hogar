// Solo guarda datos de presentación, nunca permisos ni sesiones.
export function leerCache(clave, vigencia = 300000) {
  try {
    const entrada = JSON.parse(localStorage.getItem(clave))
    if (!entrada || !Array.isArray(entrada.datos) || !Number.isFinite(entrada.fecha) ||
        Date.now() - entrada.fecha > vigencia || entrada.fecha > Date.now()) return null
    return entrada.datos
  } catch { return null }
}

export function guardarCache(clave, datos) {
  try { localStorage.setItem(clave, JSON.stringify({ fecha: Date.now(), datos })) } catch {}
}

export function borrarCache(clave) {
  try { localStorage.removeItem(clave) } catch {}
}

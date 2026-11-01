const base = import.meta.env?.BASE_URL || '/'
const clave = 'paginaDespuesLogin'
const destinosPermitidos = ['/index.html', '/carrito.html', '/mis-pedidos.html']

export function irAlLogin(destino = '/index.html') {
  sessionStorage.setItem(clave, destinosPermitidos.includes(destino) ? destino : '/index.html')
  window.location.assign(base + 'login.html')
}

export function continuarDespuesDelLogin() {
  const guardado = sessionStorage.getItem(clave)
  sessionStorage.removeItem(clave)
  window.location.replace(base + (destinosPermitidos.includes(guardado) ? guardado : '/index.html').slice(1))
}

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

async function cargar(archivo, dependencias = {}, globals = {}) {
  const contexto = vm.createContext({ console, ...globals })
  const modulo = new vm.SourceTextModule(await readFile(new URL('../' + archivo, import.meta.url), 'utf8'), { context: contexto, initializeImportMeta(meta) { meta.env = globals.__viteEnv || {} } })
  await modulo.link((nombre) => {
    const exports = dependencias[nombre]
    if (nombre === './auth.js' && exports && !exports.exigirRolCocina) exports.exigirRolCocina = async () => {}
    assert.ok(exports, 'Dependencia inesperada: ' + nombre)
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [clave, valor] of Object.entries(exports)) this.setExport(clave, valor)
    }, { context: contexto })
  })
  await modulo.evaluate()
  return modulo.namespace
}

const carrito = [{ id_producto: 7, cantidad: 2, precio: 999 }]

test('no envía pedidos sin usuario autenticado', async () => {
  let llamadas = 0
  const pedidos = await cargar('src/services/pedidos.js', {
    '../lib/supabase.js': { supabase: { rpc: () => llamadas++ } },
    './auth.js': { obtenerUsuarioActual: async () => null },
  })
  await assert.rejects(pedidos.crearPedido(carrito), { code: 'AUTH_REQUIRED' })
  assert.equal(llamadas, 0)
})

test('con sesión mantiene el contrato de crear_pedido y omite precios del navegador', async () => {
  const pedidos = await cargar('src/services/pedidos.js', {
    '../lib/supabase.js': { supabase: { rpc: async (nombre, params) => {
      assert.equal(nombre, 'crear_pedido')
      assert.deepEqual(JSON.parse(JSON.stringify(params)), { productos: [{ id_producto: 7, cantidad: 2 }] })
      return { data: 123, error: null }
    } } },
    './auth.js': { obtenerUsuarioActual: async () => ({ id: 'cliente' }) },
  })
  assert.equal(await pedidos.crearPedido(carrito), 123)
})

test('propaga errores de Supabase al confirmar', async () => {
  const error = new Error('Sin stock')
  const pedidos = await cargar('src/services/pedidos.js', {
    '../lib/supabase.js': { supabase: { rpc: async () => ({ error }) } },
    './auth.js': { obtenerUsuarioActual: async () => ({ id: 'cliente' }) },
  })
  await assert.rejects(pedidos.crearPedido(carrito), error)
})

test('verifica el usuario remoto y distingue sesión vencida de error de conexión', async () => {
  let respuesta = { data: { user: { id: 'cliente' } }, error: null }
  const auth = await cargar('src/services/auth.js', {
    '../lib/supabase.js': { supabase: { auth: {
      getSession: async () => ({ data: { session: {} }, error: null }),
      getUser: async () => respuesta,
    } } },
  })
  assert.equal((await auth.obtenerUsuarioActual()).id, 'cliente')
  respuesta = { error: { status: 401 } }
  assert.equal(await auth.obtenerUsuarioActual(), null)
  respuesta = { error: new Error('Sin conexión') }
  await assert.rejects(auth.obtenerUsuarioActual(), /Sin conexión/)
})

test('registro envía los datos personales a Auth sin guardar la contraseña como metadata', async () => {
  let solicitud
  const auth = await cargar('src/services/auth.js', {
    '../lib/supabase.js': { supabase: { auth: { signUp: async (datos) => {
      solicitud = datos
      return { data: { user: { id: 'nuevo' } }, error: null }
    } } } },
  })
  await auth.registrarCliente({ email: 'cliente@example.com', password: 'password123', nombre: 'Ana', dni: '12345678' })
  assert.equal(solicitud.password, 'password123')
  assert.equal(solicitud.options.data.nombre, 'Ana')
  assert.equal(solicitud.options.data.password, undefined)
})

test('vuelve al carrito tras el login y rechaza destinos externos o antiguos', async () => {
  const almacenamiento = new Map()
  let destino
  const rutas = await cargar('src/lib/destino-login.js', {}, {
    sessionStorage: {
      setItem: (key, value) => almacenamiento.set(key, value),
      getItem: (key) => almacenamiento.get(key),
      removeItem: (key) => almacenamiento.delete(key),
    },
    window: { location: { assign: (valor) => destino = valor, replace: (valor) => destino = valor } },
  })
  rutas.irAlLogin('/carrito.html')
  assert.equal(destino, '/login.html')
  rutas.continuarDespuesDelLogin()
  assert.equal(destino, '/carrito.html')
  assert.equal(almacenamiento.size, 0)
  for (const ruta of ['https://otro.example', '//otro.example', '/pagina-inexistente.html']) {
    almacenamiento.set('paginaDespuesLogin', ruta)
    rutas.continuarDespuesDelLogin()
    assert.equal(destino, '/index.html')
  }
})

function elemento() {
  const clases = new Set()
  return {
    value: '', textContent: '', disabled: false, listeners: {}, validity: { valid: true },
    classList: { add: (...xs) => xs.forEach(x => clases.add(x)), remove: (...xs) => xs.forEach(x => clases.delete(x)), contains: x => clases.has(x) },
    addEventListener(tipo, fn) { this.listeners[tipo] = fn },
    click() { return this.listeners.click?.() }, focus() {}, remove() {},
  }
}

async function cargarCarrito(crearPedido, actualizarPreciosCarrito = async () => false) {
  const elementos = new Map()
  const controles = [elemento(), elemento()]
  const buscar = (selector) => {
    if (!elementos.has(selector)) elementos.set(selector, elemento())
    return elementos.get(selector)
  }
  buscar('#plantilla-item-carrito').content = { cloneNode: () => ({ querySelector: buscar }) }
  buscar('#lista-carrito').append = () => {}
  buscar('#lista-carrito').querySelectorAll = () => controles
  const almacen = new Map([['carrito', JSON.stringify(carrito)]])
  let redireccion
  await cargar('src/carrito.js', {
    './services/precios-carrito.js': { actualizarPreciosCarrito },
    './services/pedidos.js': { crearPedido },
    './lib/destino-login.js': { irAlLogin: (ruta) => redireccion = ruta },
  }, {
    document: { querySelector: buscar },
    localStorage: { getItem: key => almacen.get(key), setItem: (key, value) => almacen.set(key, value), removeItem: key => almacen.delete(key) },
    alert: () => {},
  })
  return { buscar, almacen, controles, destino: () => redireccion,
    confirmar: () => buscar('#confirmar-pedido').listeners.click() }
}

test('carrito sin sesión conserva sus productos y solicita volver al carrito tras ingresar', async () => {
  const pagina = await cargarCarrito(async () => { throw Object.assign(new Error('Login'), { code: 'AUTH_REQUIRED' }) })
  await pagina.confirmar()
  assert.ok(pagina.almacen.has('carrito'))
  assert.equal(pagina.destino(), '/carrito.html')
})

test('carrito limpia productos solamente al guardar correctamente', async () => {
  const pagina = await cargarCarrito(async () => 321)
  await pagina.confirmar()
  assert.equal(pagina.almacen.has('carrito'), false)
  assert.match(pagina.buscar('#mensaje-pedido').textContent, /321/)
  assert.equal(pagina.buscar('#confirmar-pedido').disabled, true)
})

test('carrito conserva productos y permite reintentar si falla el pedido', async () => {
  const pagina = await cargarCarrito(async () => { throw new Error('Sin conexión') })
  await pagina.confirmar()
  assert.ok(pagina.almacen.has('carrito'))
  assert.equal(pagina.buscar('#confirmar-pedido').disabled, false)
  assert.match(pagina.buscar('#mensaje-pedido').textContent, /siguen en el carrito/)
})

test('carrito impide confirmar dos veces y editar cantidades durante el envío', async () => {
  let resolver
  let llamadas = 0
  const pagina = await cargarCarrito(() => { llamadas++; return new Promise(resolve => resolver = resolve) })
  const envio = pagina.confirmar()
  assert.ok(pagina.controles.every(control => control.disabled))
  await pagina.confirmar()
  // Espera a que termine la verificación de precios previa al envío.
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(llamadas, 1)
  resolver(321)
  await envio
  assert.ok(pagina.controles.every(control => !control.disabled))
})

test('registro valida el primer paso con Enter sin enviar campos de dirección ocultos', async () => {
  const elementos = new Map()
  const buscar = selector => {
    if (!elementos.has(selector)) elementos.set(selector, elemento())
    return elementos.get(selector)
  }
  buscar('#paso-direccion').classList.add('hidden')
  let llamadas = 0
  await cargar('src/pages/registro.js', {
    '../style.css': {},
    '../services/auth.js': { registrarCliente: async () => llamadas++ },
  }, { document: { querySelector: buscar } })
  const enviar = () => buscar('#formulario-registro').listeners.submit({ preventDefault() {} })
  await enviar()
  assert.match(buscar('#mensaje-registro').textContent, /nombre válido/)
  for (const [campo, valor] of Object.entries({ nombre: 'Ana', apellido: 'Perez', email: 'ana@example.com', dni: '12345678', telefono: '3421234567', password: 'password123', 'repetir-password': 'password123' })) buscar('#' + campo).value = valor
  await enviar()
  assert.equal(buscar('#paso-direccion').classList.contains('hidden'), false)
  assert.equal(llamadas, 0)
  await enviar()
  assert.match(buscar('#mensaje-registro').textContent, /calle válida/)
  assert.equal(llamadas, 0)
})

test('platos: valida descripción, precio y URL', async () => {
  const productos = await cargar('src/services/productos.js', { '../lib/supabase.js': { supabase: {} } }, { URL })
  const datos = { nombre: ' Hamburguesa ', descripcion: ' Completa ', precio: '8700', foto: 'https://example.com/foto.jpg' }
  assert.equal(productos.validarProducto(datos).descripcion, 'Completa')
  for (const cambios of [{ descripcion: ' ' }, { precio: '-1' }, { precio: '1.234' }, { foto: 'javascript:alert(1)' }]) {
    assert.throws(() => productos.validarProducto({ ...datos, ...cambios }))
  }
  assert.throws(() => productos.validarImagen({ type: 'image/svg+xml', size: 100 }))
  assert.throws(() => productos.validarImagen({ type: 'image/png', size: 6 * 1024 * 1024 }))
})

test('platos: crear guarda descripción y editar preserva el estado existente', async () => {
  const operaciones = []
  const consulta = {
    insert(datos) { operaciones.push(['insert', datos]); return this },
    update(datos) { operaciones.push(['update', datos]); return this },
    eq(columna, id) { operaciones.push(['eq', columna, id]); return this },
    select() { return this },
    single: async () => ({ data: { id_producto: 42 }, error: null }),
  }
  const productos = await cargar('src/services/productos.js', { '../lib/supabase.js': { supabase: { from: () => consulta } } }, { URL })
  const datos = { nombre: 'Pizza', descripcion: 'Pizza tradicional', precio: '7000', estado: 'otro', id_producto: 999 }
  assert.equal((await productos.guardarProducto(datos)).id_producto, 42)
  assert.equal(operaciones[0][1].descripcion, 'Pizza tradicional')
  assert.equal(operaciones[0][1].estado, 'disponible')
  assert.equal(operaciones[0][1].id_producto, undefined)
  operaciones.length = 0
  await productos.guardarProducto(datos, '42')
  assert.equal(operaciones[0][0], 'update')
  assert.equal(operaciones[0][1].estado, undefined)
  assert.deepEqual(operaciones[1], ['eq', 'id_producto', '42'])
})

test('platos: elimina sólo la imagen recién subida si falla el guardado', async () => {
  const eliminados = []
  const storage = {
    upload: async () => ({ error: null }),
    getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/nueva.png' } }),
    remove: async rutas => { eliminados.push(...rutas); return { error: null } },
  }
  const consulta = { update() { return this }, eq() { return this }, select() { return this }, single: async () => ({ error: new Error('Sin permisos') }) }
  const productos = await cargar('src/services/productos.js', { '../lib/supabase.js': { supabase: { from: () => consulta, storage: { from: () => storage } } } }, { URL, crypto: { randomUUID: () => 'archivo-nuevo' } })
  await assert.rejects(productos.guardarProducto({ nombre: 'Pizza', descripcion: 'Tradicional', precio: 7000 }, '42', { archivo: { type: 'image/png', size: 100 }, bucket: 'productos' }), /Sin permisos/)
  assert.deepEqual(eliminados, ['archivo-nuevo.png'])
})

test('carta: edita cantidades y quita solo mediante el botón X', async () => {
  const nodos = new Map()
  const buscar = selector => {
    if (!nodos.has(selector)) {
      const nodo = elemento()
      nodo.classList.toggle = (clase, estado) => estado ? nodo.classList.add(clase) : nodo.classList.remove(clase)
      nodo.setCustomValidity = mensaje => nodo.error = mensaje
      nodo.reportValidity = () => {}
      nodos.set(selector, nodo)
    }
    return nodos.get(selector)
  }
  buscar('#plantilla-producto').content = { cloneNode: () => ({ querySelector: buscar }) }
  buscar('#lista-productos').append = () => {}
  const almacen = new Map()
  await cargar('src/main.js', {
    './lib/cache-navegacion.js': { leerCache: () => null, guardarCache() {} },
    './services/productos.js': { obtenerProductos: async () => [{ id_producto: 1, nombre: 'Pizza', precio: 7000 }] },
  }, {
    document: { querySelector: buscar },
    localStorage: { getItem: clave => almacen.get(clave), setItem: (clave, valor) => almacen.set(clave, valor) },
  })
  buscar('[data-cantidad]').value = '3'
  buscar('[data-agregar]').click()
  assert.equal(JSON.parse(almacen.get('carrito'))[0].cantidad, 3)
  assert.match(buscar('[data-agregar]').textContent, /En el carrito \(3\)/)
  assert.ok(buscar('[data-agregar]').classList.contains('bg-green-700'))
  assert.equal(buscar('[data-agregar]').disabled, true)
  assert.equal(buscar('[data-cantidad]').disabled, false)
  buscar('[data-cantidad]').value = '2'
  buscar('[data-cantidad]').listeners.input()
  assert.equal(JSON.parse(almacen.get('carrito'))[0].cantidad, 2)
  buscar('[data-cantidad]').value = '-1'
  buscar('[data-cantidad]').listeners.input()
  assert.equal(JSON.parse(almacen.get('carrito'))[0].cantidad, 2)
  buscar('[data-cantidad]').listeners.change()
  assert.equal(buscar('[data-cantidad]').value, 2)
  assert.equal(buscar('[data-quitar-carta]').classList.contains('hidden'), false)
  assert.match(buscar('[data-agregar]').textContent, /En el carrito \(2\)/)
  buscar('[data-agregar]').click()
  assert.equal(JSON.parse(almacen.get('carrito')).length, 1)
  buscar('[data-quitar-carta]').click()
  assert.equal(JSON.parse(almacen.get('carrito')).length, 0)
  assert.equal(buscar('[data-agregar]').textContent, 'Agregar al carrito')
})

test('mis pedidos: filtra por el DNI del perfil autenticado y por estados activos', async () => {
  const filtros = []
  const consulta = {
    select() { return this },
    eq(columna, valor) { filtros.push([columna, valor]); return this },
    maybeSingle: async () => ({ data: { dni: 12345678 }, error: null }),
    in(columna, valores) { filtros.push([columna, [...valores]]); return this },
    order: async () => ({ data: [{ id_pedido: 7 }], error: null }),
  }
  const pedidos = await cargar('src/services/pedidos.js', {
    '../lib/supabase.js': { supabase: { from: () => consulta } },
    './auth.js': { obtenerUsuarioActual: async () => ({ id: 'mi-cuenta' }) },
  })
  assert.equal((await pedidos.obtenerMisPedidos())[0].id_pedido, 7)
  assert.deepEqual(filtros, [['auth_user_id', 'mi-cuenta'], ['dni', 12345678], ['estado_pedido', ['Pendiente', 'En preparación', 'Listo']]])
})

test('mis pedidos: sin sesión no consulta perfiles ni pedidos', async () => {
  let llamadas = 0
  const pedidos = await cargar('src/services/pedidos.js', {
    '../lib/supabase.js': { supabase: { from: () => llamadas++ } },
    './auth.js': { obtenerUsuarioActual: async () => null },
  })
  await assert.rejects(pedidos.obtenerMisPedidos(), { code: 'AUTH_REQUIRED' })
  assert.equal(llamadas, 0)
})

test('comandas: rechaza consultar y actualizar sin rol cocina antes de acceder a pedidos', async () => {
  let llamadas = 0
  const pedidos = await cargar('src/services/pedidos.js', {
    '../lib/supabase.js': { supabase: { from: () => llamadas++ } },
    './auth.js': {
      obtenerUsuarioActual: async () => null,
      exigirRolCocina: async () => { throw Object.assign(new Error('Acceso restringido'), { code: 'FORBIDDEN' }) },
    },
  })
  await assert.rejects(pedidos.obtenerPedidos(), { code: 'FORBIDDEN' })
  await assert.rejects(pedidos.actualizarEstadoPedido(1, 'Listo'), { code: 'FORBIDDEN' })
  assert.equal(llamadas, 0)
})

test('Pages: login y regreso al carrito conservan la base del repositorio', async () => {
  const almacen = new Map()
  let destino
  const rutas = await cargar('src/lib/destino-login.js', {}, {
    __viteEnv: { BASE_URL: '/Sabor_a_Hogar/' },
    sessionStorage: { setItem: (k, v) => almacen.set(k, v), getItem: k => almacen.get(k), removeItem: k => almacen.delete(k) },
    window: { location: { assign: valor => destino = valor, replace: valor => destino = valor } },
  })
  rutas.irAlLogin('/carrito.html')
  assert.equal(destino, '/Sabor_a_Hogar/login.html')
  rutas.continuarDespuesDelLogin()
  assert.equal(destino, '/Sabor_a_Hogar/carrito.html')
  almacen.set('paginaDespuesLogin', 'https://externo.example')
  rutas.continuarDespuesDelLogin()
  assert.equal(destino, '/Sabor_a_Hogar/index.html')
})

async function cargarControlCuenta({ bloqueado = false, sesion = true, error = null, rol = 'cliente', ruta = '/index.html' } = {}) {
  const nodos = []
  let visible = false
  let destino
  const elemento = () => ({ textContent: '', setAttribute() {}, addEventListener() {}, append(...items) { nodos.push(...items) } })
  const control = await cargar('src/lib/control-cuenta.js', {
    './supabase.js': { supabase: {
      auth: {
        getSession: async () => ({ data: { session: sesion ? { user: { id: 'cliente' } } : null } }),
        getUser: async () => ({ data: { user: { id: 'cliente' } } }),
        onAuthStateChange() {},
      },
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { bloqueado, rol }, error }) }) }) }),
    } },
  }, {
    document: {
      body: { replaceChildren() {}, append(...items) { nodos.push(...items) } },
      createElement: elemento,
      querySelector: () => ({ remove() { visible = true } }),
    },
    __viteEnv: { BASE_URL: '/Sabor_a_Hogar/' },
    window: { addEventListener() {}, location: { pathname: ruta, replace(valor) { destino = valor } } },
    setInterval() {},
    setTimeout() {},
  })
  const permitido = await control.accesoPermitido
  return { permitido, nodos, visible, destino }
}

test('administración: rechaza visitantes y roles distintos de admin en todas sus páginas', async () => {
  for (const pagina of ['administrador', 'admin-carta', 'admin-plato', 'admin-stock', 'admin-ingrediente', 'admin-usuarios']) {
    for (const cuenta of [{ sesion: false }, { rol: 'cliente' }, { rol: 'cocina' }, { rol: 'desconocido' }, { rol: null }]) {
      const resultado = await cargarControlCuenta({ ...cuenta, ruta: '/Sabor_a_Hogar/' + pagina + '.html' })
      assert.equal(resultado.permitido, false)
      assert.equal(resultado.visible, false)
      assert.equal(resultado.destino, '/Sabor_a_Hogar/index.html')
    }
    assert.equal((await cargarControlCuenta({ rol: 'admin', ruta: '/' + pagina + '.html' })).permitido, true)
  }
})

test('administración: un admin bloqueado solo ve el aviso de bloqueo', async () => {
  const resultado = await cargarControlCuenta({ rol: 'admin', bloqueado: true, ruta: '/administrador.html' })
  assert.equal(resultado.permitido, false)
  assert.equal(resultado.destino, undefined)
  assert.ok(resultado.nodos.some(n => n.textContent.includes('Su cuenta ha sido bloqueada.')))
})

test('cuenta bloqueada: impide cargar la página y ofrece solamente cerrar sesión', async () => {
  const resultado = await cargarControlCuenta({ bloqueado: true })
  assert.equal(resultado.permitido, false)
  assert.equal(resultado.visible, false)
  assert.ok(resultado.nodos.some(n => n.textContent.includes('alexis_novello99@hotmail.com')))
  assert.ok(resultado.nodos.some(n => n.textContent === 'Cerrar sesión'))
})

test('cuenta activa y visitante: permiten cargar la página', async () => {
  assert.equal((await cargarControlCuenta()).permitido, true)
  assert.equal((await cargarControlCuenta({ sesion: false })).permitido, true)
})

test('si falla la consulta del bloqueo, no habilita el resto de la página', async () => {
  assert.equal((await cargarControlCuenta({ error: new Error('Sin conexión') })).permitido, false)
})

test('caché de navegación: conserva datos válidos y descarta vencidos o corruptos', async () => {
  const almacen = new Map()
  const cache = await cargar('src/lib/cache-navegacion.js', {}, {
    localStorage: { getItem: k => almacen.get(k), setItem: (k, v) => almacen.set(k, v), removeItem: k => almacen.delete(k) },
  })
  cache.guardarCache('carta', [{ id_producto: 1 }])
  assert.equal(cache.leerCache('carta')[0].id_producto, 1)
  almacen.set('carta', JSON.stringify({ fecha: Date.now() - 400000, datos: [] }))
  assert.equal(cache.leerCache('carta'), null)
  almacen.set('carta', 'invalido')
  assert.equal(cache.leerCache('carta'), null)
  cache.guardarCache('pedidos:cuenta1', [{ id_pedido: 1 }])
  assert.equal(cache.leerCache('pedidos:cuenta2'), null)
  cache.borrarCache('pedidos:cuenta1')
  assert.equal(cache.leerCache('pedidos:cuenta1'), null)
})

test('caché de navegación: funciona sin almacenamiento disponible', async () => {
  const cache = await cargar('src/lib/cache-navegacion.js', {}, {
    localStorage: { getItem() { throw new Error('No disponible') }, setItem() { throw new Error('Sin espacio') }, removeItem() { throw new Error('No disponible') } },
  })
  assert.equal(cache.leerCache('carta'), null)
  cache.guardarCache('carta', [])
  cache.borrarCache('carta')
})

test('precios del carrito: usa el precio actual y mantiene cantidades', async () => {
  const servicio = await cargar('src/services/precios-carrito.js', {
    '../lib/supabase.js': { supabase: { from: () => ({ select: () => ({ in: async () => ({ data: [{ id_producto: 7, precio: '1500.50' }] }) }) }) } },
  })
  const items = [{ id_producto: 7, precio: 999, cantidad: 2 }]
  assert.equal(await servicio.actualizarPreciosCarrito(items), true)
  assert.equal(items[0].precio, 1500.5)
  assert.equal(items[0].cantidad, 2)
  assert.equal(await servicio.actualizarPreciosCarrito(items), false)
})

test('carrito: si cambia el precio al confirmar, actualiza el total y exige otra confirmación', async () => {
  let consultas = 0
  let pedidos = 0
  const pagina = await cargarCarrito(async () => { pedidos++; return 456 }, async items => {
    consultas++
    if (consultas === 2) { items[0].precio = 1500; return true }
    return false
  })
  await pagina.confirmar()
  assert.equal(pedidos, 0)
  assert.equal(JSON.parse(pagina.almacen.get('carrito'))[0].precio, 1500)
  assert.match(pagina.buscar('#mensaje-pedido').textContent, /precios cambiaron/)
  assert.match(pagina.buscar('#total-carrito').textContent, /3.000/)
  await pagina.confirmar()
  assert.equal(pedidos, 1)
})

test('carrito: un error al verificar precios impide enviar y conserva los productos', async () => {
  let pedidos = 0
  const pagina = await cargarCarrito(async () => pedidos++, async () => { throw new Error('Sin conexión') })
  await pagina.confirmar()
  assert.equal(pedidos, 0)
  assert.ok(pagina.almacen.has('carrito'))
  assert.equal(pagina.buscar('#confirmar-pedido').disabled, false)
})

test('precios: si falta un producto, no modifica parcialmente el carrito', async () => {
  const servicio = await cargar('src/services/precios-carrito.js', {
    '../lib/supabase.js': { supabase: { from: () => ({ select: () => ({ in: async () => ({ data: [{ id_producto: 7, precio: 1500 }] }) }) }) } },
  })
  const items = [{ id_producto: 7, precio: 999 }, { id_producto: 8, precio: 100 }]
  await assert.rejects(servicio.actualizarPreciosCarrito(items), /verificar el precio/)
  assert.equal(items[0].precio, 999)
})

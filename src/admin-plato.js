import { obtenerProducto, guardarProducto, validarImagen } from './services/productos.js'

const formulario = document.querySelector('#formulario-plato')
const campos = document.querySelector('#campos-plato')
const mensaje = document.querySelector('#mensaje-plato')
const nombre = document.querySelector('#nombre-plato')
const descripcion = document.querySelector('#descripcion-plato')
const precio = document.querySelector('#precio-plato')
let fotoActual = ''
const nombreArchivo = document.querySelector('#nombre-archivo')
const elegirFoto = document.querySelector('#elegir-foto')
const subirFoto = document.querySelector('#subir-foto')
const textoElegirFoto = document.querySelector('#texto-elegir-foto')
const errorFoto = document.querySelector('#error-foto')
const boton = document.querySelector('#guardar-plato')
const parametros = new URLSearchParams(window.location.search)
let id = parametros.get('id')
const bucket = import.meta.env.VITE_SUPABASE_PRODUCTOS_BUCKET?.trim() || 'productos'
let guardando = false
let cargado = false

document.querySelector('#ayuda-foto').textContent = 'JPG, PNG o WebP. Máximo 5 MB. La imagen se sube al guardar el plato.'

function actualizarArchivo(nombreGuardado) {
  const archivo = subirFoto.files[0]
  let nombreActual = ''
  if (fotoActual) {
    try { nombreActual = decodeURIComponent(new URL(fotoActual).pathname.split('/').pop()) } catch { nombreActual = 'Imagen actual' }
  }
  nombreArchivo.textContent = archivo?.name || nombreGuardado || nombreActual || 'Ningún archivo seleccionado.'
  textoElegirFoto.textContent = archivo || fotoActual ? 'Cambiar imagen' : 'Subir imagen'
}

elegirFoto.addEventListener('click', () => subirFoto.click())
subirFoto.addEventListener('change', () => {
  errorFoto.textContent = ''
  const archivo = subirFoto.files[0]
  if (archivo) {
    try { validarImagen(archivo) }
    catch (error) {
      subirFoto.value = ''
      errorFoto.textContent = error.message
    }
  }
  actualizarArchivo()
})

async function cargar() {
  if (parametros.has('id') && !id?.trim()) {
    mensaje.textContent = 'El identificador del plato no es válido. Volvé a la carta.'
    return
  }
  if (id !== null) {
    document.querySelector('#titulo-plato').textContent = 'Editar plato'
    mensaje.textContent = 'Cargando plato...'
    try {
      const producto = await obtenerProducto(id)
      nombre.value = producto.nombre || ''
      descripcion.value = producto.descripcion || ''
      precio.value = producto.precio
      fotoActual = producto.foto || ''
      actualizarArchivo()
    } catch (error) {
      console.error('No se pudo cargar el plato:', error)
      mensaje.textContent = 'No se pudo cargar el plato. Puede no existir o no tenés permisos para verlo. Volvé a la carta o recargá la página.'
      return
    }
  }
  mensaje.textContent = ''
  campos.disabled = false
  cargado = true
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault()
  if (guardando || !cargado) return
  guardando = true
  campos.disabled = true
  boton.textContent = 'Guardando...'
  mensaje.classList.remove('text-green-800', 'text-red-700')
  mensaje.textContent = ''
  try {
    const archivo = subirFoto.files[0]
    const producto = await guardarProducto({ nombre: nombre.value, descripcion: descripcion.value, precio: precio.value, foto: archivo ? '' : fotoActual }, id, { archivo, bucket })
    // Conserva el identificador para que otro guardado actualice, en vez de duplicar.
    id = String(producto.id_producto)
    window.history.replaceState(null, '', 'admin-plato.html?id=' + encodeURIComponent(id))
    mensaje.classList.add('text-green-800')
    mensaje.textContent = 'Plato guardado correctamente. Los cambios ya están disponibles en la carta.'
    document.querySelector('#titulo-plato').textContent = 'Editar plato'
    // Recupera la URL guardada después de subir un archivo, sin reenviarlo.
    if (archivo) {
      try {
        const actualizado = await obtenerProducto(id)
        fotoActual = actualizado.foto || ''
        subirFoto.value = ''
        actualizarArchivo(archivo.name)
      } catch {
        // El guardado ya fue confirmado. Evita subir el mismo archivo otra vez.
        cargado = false
        mensaje.textContent = 'Plato guardado. Recargá la página antes de continuar editando.'
      }
    }
  } catch (error) {
    console.error('No se pudo guardar el plato:', error)
    mensaje.classList.add('text-red-700')
    mensaje.textContent = 'No se pudo guardar: ' + error.message
  } finally {
    guardando = false
    campos.disabled = !cargado
    boton.textContent = 'Guardar'
  }
})

cargar()

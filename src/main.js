import './style.css'

import { obtenerProductos } from './services/productos.js'

async function probarConexion() {
  try {
    const productos = await obtenerProductos()

    console.log('Consulta realizada correctamente')
    console.table(productos)
  } catch (error) {
    console.error('No se pudieron consultar los productos:', error.message)
  }
}

probarConexion()
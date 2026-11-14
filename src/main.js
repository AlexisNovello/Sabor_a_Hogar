import { obtenerProductos } from "./services/productos.js";
import { leerCache, guardarCache } from './lib/cache-navegacion.js';

const claveCarta = 'sabor:carta:v1';
const guardados = leerCache(claveCarta);
const productos = guardados ?? await obtenerProductos();
if (!guardados) guardarCache(claveCarta, productos);

// llama los elementos del html
const lista = document.querySelector("#lista-productos");
const plantilla = document.querySelector("#plantilla-producto");

// formato del precio a pesos
const formatoPrecio = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

// Array del carrito que contendrá los productos seleccionados
const carritoGuardado = localStorage.getItem("carrito");
const carrito = carritoGuardado ? JSON.parse(carritoGuardado) : [];

// crea una tarjeta por cada producto recibido de Supabase
function mostrarProductos(productos) {
  if (lista.replaceChildren) lista.replaceChildren();
  if (productos.length === 0) lista.textContent = "No hay productos disponibles.";
  for (const producto of productos) {
    const copia = plantilla.content.cloneNode(true); // copia de la plantilla para modificar

    // completa la tarjeta con los datos del producto actual
    copia.querySelector("[data-nombre]").textContent = producto.nombre;
    copia.querySelector("[data-descripcion]").textContent = producto.descripcion;
    copia.querySelector("[data-foto]").src = producto.foto;
    copia.querySelector("[data-precio]").textContent = formatoPrecio.format(
      producto.precio,
    );
    // muestra la disponibilidad calculada según los ingredientes
    const sinStock = producto.disponible === false;
    const estado = copia.querySelector("[data-estado]");
    estado.textContent = sinStock ? "Sin stock" : "Disponible";
    estado.classList.toggle("bg-green-100", !sinStock);
    estado.classList.toggle("text-green-800", !sinStock);
    estado.classList.toggle("bg-red-100", sinStock);
    estado.classList.toggle("text-red-800", sinStock);

    // cuando presiona el boton "agregar" envia ese producto al carrito
    const botonAgregar = copia.querySelector("[data-agregar]");
    const cantidad = copia.querySelector("[data-cantidad]");
    const mensaje = copia.querySelector("[data-mensaje-carrito]");

    const restar = copia.querySelector("[data-restar]");
    const sumar = copia.querySelector("[data-sumar]");
    for (const [boton, paso] of [
      [restar, -1],
      [sumar, 1],
    ]) {
      boton.addEventListener("click", () => {
        if (cantidad.disabled) return;
        const actual = Number(cantidad.value);
        cantidad.value = Math.max(
          1,
          (Number.isSafeInteger(actual) && actual > 0 ? actual : 1) + paso,
        );
        cantidad.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }

    const botonQuitar = copia.querySelector("[data-quitar-carta]");
    const itemInicial = carrito.find(item => item.id_producto === producto.id_producto);
    if (itemInicial) cantidad.value = itemInicial.cantidad;

    function actualizarBoton() {
      const item = carrito.find(item => item.id_producto === producto.id_producto);
      const agregado = Boolean(item);
      const desactivado = sinStock && !agregado;
      botonQuitar.classList.toggle('hidden', !agregado);
      botonAgregar.classList.toggle('bg-red-600', !agregado && !sinStock);
      botonAgregar.classList.toggle('hover:bg-red-700', !agregado && !sinStock);
      botonAgregar.classList.toggle('bg-green-700', agregado);
      botonAgregar.classList.toggle('rounded-r-none', agregado);
      botonAgregar.classList.toggle('bg-gray-400', desactivado);
      botonAgregar.disabled = desactivado || agregado;
      cantidad.disabled = desactivado;
      restar.disabled = desactivado;
      sumar.disabled = desactivado;
      botonAgregar.classList.toggle('cursor-pointer', !desactivado && !agregado);
      botonAgregar.classList.toggle('cursor-not-allowed', desactivado);
      botonAgregar.textContent = agregado
        ? `En el carrito (${item.cantidad})`
        : sinStock ? 'Sin stock' : 'Agregar al carrito';
    }
    actualizarBoton();
    cantidad.addEventListener('input', () => {
      cantidad.setCustomValidity('');
      const porciones = Number(cantidad.value);
      if (!Number.isSafeInteger(porciones) || porciones < 1) {
        cantidad.setCustomValidity('Ingresá una cantidad entera de al menos una porción.');
        return;
      }
      const item = carrito.find(item => item.id_producto === producto.id_producto);
      if (item) {
        item.cantidad = porciones;
        localStorage.setItem('carrito', JSON.stringify(carrito));
        actualizarBoton();
        mensaje.textContent = '';
      }
    });
    cantidad.addEventListener('change', () => {
      const numero = Number(cantidad.value);
      if (!Number.isSafeInteger(numero) || numero < 1) {
        cantidad.value = carrito.find(item => item.id_producto === producto.id_producto)?.cantidad ?? 1;
        cantidad.setCustomValidity('');
      }
    });
    botonQuitar.addEventListener('click', () => {
      const posicion = carrito.findIndex(item => item.id_producto === producto.id_producto);
      if (posicion !== -1) {
        carrito.splice(posicion, 1);
        localStorage.setItem('carrito', JSON.stringify(carrito));
        cantidad.value = 1;
        cantidad.setCustomValidity('');
        actualizarBoton();
        mensaje.textContent = '';
        return;
      }
    });
    botonAgregar.addEventListener('click', () => {
      if (carrito.some(item => item.id_producto === producto.id_producto)) return;
      if (sinStock) return;
      const porciones = Number(cantidad.value);
      if (!Number.isSafeInteger(porciones) || porciones < 1) {
        cantidad.setCustomValidity(
          "Ingresá una cantidad entera de al menos una porción.",
        );
        cantidad.reportValidity();
        return;
      }
      cantidad.setCustomValidity("");
      // busca si el producto ya está en el carrito, en caso de si, aumenta su cantidad, sino crea el objeto
      const productoExistente = carrito.find(
        (item) => item.id_producto === producto.id_producto,
      );

      if (productoExistente) {
        productoExistente.cantidad += porciones;
      } else {
        carrito.push({
          id_producto: producto.id_producto,
          nombre: producto.nombre,
          descripcion: producto.descripcion,
          foto: producto.foto,
          precio: producto.precio,
          cantidad: porciones,
        });
      }

      localStorage.setItem("carrito", JSON.stringify(carrito)); // guardamos los datos
      actualizarBoton();
      mensaje.textContent = '';
    });

    // inserto cada plantilla a la lista
    lista.append(copia);
  }
}
mostrarProductos(productos);

// llama los elementos del buscador
const formularioBusqueda = document.querySelector("#formulario-busqueda");
const buscarProductos = document.querySelector("#buscar-productos");

// convierte el texto a minúsculas y quita los acentos
function prepararBusqueda(texto) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// muestra solamente los productos que coinciden con el nombre
function filtrarProductos() {
  const busqueda = prepararBusqueda(buscarProductos.value);
  const tarjetas = lista.querySelectorAll("article");

  for (const tarjeta of tarjetas) {
    const nombre = tarjeta.querySelector("[data-nombre]").textContent;
    const coincide = prepararBusqueda(nombre).includes(busqueda);

    tarjeta.classList.toggle("hidden", !coincide);
  }
}

// busca al presionar el botón o Enter
formularioBusqueda.addEventListener("submit", (evento) => {
  evento.preventDefault();
  filtrarProductos();
});

// actualiza los resultados mientras se escribe o se borra
buscarProductos.addEventListener("input", filtrarProductos);

// La copia local permite volver sin esperar otra descarga del catálogo.
// La base sigue validando precio, publicación y stock al confirmar el pedido.
if (guardados) {
  obtenerProductos().then((actuales) => {
    guardarCache(claveCarta, actuales);
    if (JSON.stringify(actuales) !== JSON.stringify(productos)) {
      mostrarProductos(actuales);
      filtrarProductos();
    }
  }).catch((error) => console.error('No se pudo actualizar la carta:', error));
}

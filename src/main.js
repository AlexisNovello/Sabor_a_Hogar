import "./style.css";

import { obtenerProductos } from "./services/productos.js";

const productos = await obtenerProductos();

// llama los elementos del html
const lista = document.querySelector("#lista-productos");
const plantilla = document.querySelector("#plantilla-producto");

// mensaje si no hay productos cargados
if (productos.length === 0) {
  lista.textContent = "No hay productos disponibles.";
}

// formato del precio a pesos
const formatoPrecio = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

// crea una tarjeta por cada producto recibido de Supabase
for (const producto of productos) {
  const copia = plantilla.content.cloneNode(true); // copia de la plantilla para modificar

  // completa la tarjeta con los datos del producto actual
  copia.querySelector("[data-foto]").src = producto.foto;
  copia.querySelector("[data-nombre]").textContent = producto.nombre;
  copia.querySelector("[data-descripcion]").textContent = producto.descripcion;
  copia.querySelector("[data-precio]").textContent = formatoPrecio.format(
    producto.precio,
  );
  copia.querySelector("[data-estado]").textContent = producto.estado;

  // inserto cada plantilla a la lista
  lista.append(copia);
}

console.log("Consulta realizada correctamente");
console.table(productos);

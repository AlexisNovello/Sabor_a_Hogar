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

// Array del carrito que contendrá los productos seleccionados
const carritoGuardado = localStorage.getItem("carrito");
const carrito = carritoGuardado ? JSON.parse(carritoGuardado) : [];

// crea una tarjeta por cada producto recibido de Supabase
for (const producto of productos) {
  const copia = plantilla.content.cloneNode(true); // copia de la plantilla para modificar

  // completa la tarjeta con los datos del producto actual
  copia.querySelector("[data-nombre]").textContent = producto.nombre;
  copia.querySelector("[data-descripcion]").textContent = producto.descripcion;
  copia.querySelector("[data-foto]").src = producto.foto;
  copia.querySelector("[data-precio]").textContent = formatoPrecio.format(
    producto.precio,
  );
  copia.querySelector("[data-estado]").textContent = producto.estado;

  // cuando presiona el boton "agregar" envia ese producto al carrito
  const botonAgregar = copia.querySelector("[data-agregar]");
  const cantidad = copia.querySelector("[data-cantidad]");
  const mensaje = copia.querySelector("[data-mensaje-carrito]");

  const restar = copia.querySelector('[data-restar]');
  const sumar = copia.querySelector('[data-sumar]');
  for (const [boton, paso] of [[restar, -1], [sumar, 1]]) {
    boton.addEventListener('click', () => {
      if (cantidad.disabled) return;
      const actual = Number(cantidad.value);
      cantidad.value = Math.max(1, (Number.isSafeInteger(actual) && actual > 0 ? actual : 1) + paso);
      cantidad.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  function actualizarBoton() {
    const item = carrito.find((item) => item.id_producto === producto.id_producto);
    const agregado = Boolean(item?.cantidad);
    botonAgregar.classList.toggle("bg-red-600", !agregado);
    botonAgregar.classList.toggle("hover:bg-red-700", !agregado);
    botonAgregar.classList.toggle("bg-green-700", agregado);
    botonAgregar.classList.toggle("hover:bg-green-800", agregado);
    botonAgregar.disabled = agregado;
    cantidad.disabled = agregado;
    restar.disabled = agregado;
    sumar.disabled = agregado;
    botonAgregar.classList.toggle("cursor-pointer", !agregado);
    botonAgregar.classList.toggle("cursor-default", agregado);
    botonAgregar.textContent = agregado ? `En el carrito (${item.cantidad})` : "Agregar al carrito";
  }
  actualizarBoton();
  cantidad.addEventListener("input", () => cantidad.setCustomValidity(""));
  botonAgregar.addEventListener("click", () => {
    if (carrito.some((item) => item.id_producto === producto.id_producto)) return;
    const porciones = Number(cantidad.value);
    if (!Number.isSafeInteger(porciones) || porciones < 1) {
      cantidad.setCustomValidity("Ingresá una cantidad entera de al menos una porción.");
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
    mensaje.textContent = `Se ${porciones === 1 ? "agregó 1 porción" : `agregaron ${porciones} porciones`} de ${producto.nombre}.`;
  });

  // inserto cada plantilla a la lista
  lista.append(copia);
}

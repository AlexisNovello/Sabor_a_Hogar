import "./style.css";

// trae los productos guardados en el navegador
const carritoGuardado = localStorage.getItem("carrito");
const carrito = carritoGuardado ? JSON.parse(carritoGuardado) : [];

console.table(carrito);

const lista = document.querySelector("#lista-carrito");
const plantilla = document.querySelector("#plantilla-item-carrito");

// mensaje si el carrito esta vacio
if (carrito.length === 0) {
  lista.textContent = "Tu carrito está vacío.";
}

const formatoPrecio = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

// crea una tarjeta para cada producto del carrito
for (const producto of carrito) {
  const copia = plantilla.content.cloneNode(true);
  const tarjeta = copia.querySelector("article");

  copia.querySelector("[data-nombre]").textContent = producto.nombre;
  copia.querySelector("[data-descripcion]").textContent = producto.descripcion;
  copia.querySelector("[data-foto]").src = producto.foto;
  copia.querySelector("[data-precio]").textContent = formatoPrecio.format(
    producto.precio,
  );
  copia.querySelector("[data-input-cantidad]").value = producto.cantidad;

  // elimina el producto seleccionado y guarda los cambios
  const botonQuitar = copia.querySelector("[data-quitar]");

  botonQuitar.addEventListener("click", () => {
    const posicion = carrito.findIndex(
      (item) => item.id_producto === producto.id_producto,
    );

    if (posicion !== -1) {
      carrito.splice(posicion, 1);

      localStorage.setItem("carrito", JSON.stringify(carrito));

      tarjeta.remove();
      actualizarTotal();

      if (carrito.length === 0) {
        lista.textContent = "Tu carrito está vacío.";
      }
    }
  });

  // guarda la nueva cantidad
  const inputCantidad = copia.querySelector("[data-input-cantidad]");

  inputCantidad.addEventListener("change", () => {
    const nuevaCantidad = Number(inputCantidad.value);

    if (!Number.isInteger(nuevaCantidad) || nuevaCantidad < 1) {
      inputCantidad.value = producto.cantidad;
      return;
    }

    producto.cantidad = nuevaCantidad;

    localStorage.setItem("carrito", JSON.stringify(carrito));
    actualizarTotal();
  });

  lista.append(copia);
}

// calcula el total segun los precios y las cantidades y lo actualiza
function actualizarTotal() {
  let total = 0;

  for (const producto of carrito) {
    total += producto.precio * producto.cantidad;
  }

  const totalCarrito = document.querySelector("#total-carrito");
  totalCarrito.textContent = formatoPrecio.format(total);
}

actualizarTotal();

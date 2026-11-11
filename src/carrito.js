import { crearPedido } from "./services/pedidos.js";
import { irAlLogin } from "./lib/destino-login.js";

// trae los productos guardados en el navegador
const carritoGuardado = localStorage.getItem("carrito");
const carrito = carritoGuardado ? JSON.parse(carritoGuardado) : [];

const lista = document.querySelector("#lista-carrito");
const plantilla = document.querySelector("#plantilla-item-carrito");
const botonConfirmar = document.querySelector("#confirmar-pedido");
const mensajePedido = document.querySelector("#mensaje-pedido");
let guardando = false;

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

  for (const [selector, paso] of [
    ["[data-restar]", -1],
    ["[data-sumar]", 1],
  ]) {
    copia.querySelector(selector).addEventListener("click", () => {
      if (guardando) return;
      const actual = Number(inputCantidad.value);
      inputCantidad.value = Math.max(
        1,
        (Number.isSafeInteger(actual) && actual > 0
          ? actual
          : producto.cantidad) + paso,
      );
      inputCantidad.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

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
  botonConfirmar.disabled = guardando || carrito.length === 0;
}

actualizarTotal();

botonConfirmar.addEventListener("click", async () => {
  if (guardando) return;
  if (carrito.length === 0) {
    alert("Agregá productos al carrito antes de confirmar.");
    return;
  }

  guardando = true;
  // Mantiene estable el pedido mientras se verifica la sesión y se guarda.
  lista
    .querySelectorAll("button, input")
    .forEach((elemento) => (elemento.disabled = true));
  botonConfirmar.disabled = true;
  botonConfirmar.textContent = "Guardando...";
  mensajePedido.textContent = "";
  mensajePedido.classList.remove(
    "rounded-md",
    "p-4",
    "bg-green-100",
    "text-green-800",
    "bg-red-100",
    "text-red-800",
  );

  try {
    const idPedido = await crearPedido(carrito);

    //limpiar el carrito solamente despuees de guardar
    localStorage.removeItem("carrito");
    carrito.length = 0;

    lista.textContent = "Los productos de tu pedido ya fueron enviados.";
    actualizarTotal();

    mensajePedido.classList.add(
      "rounded-md",
      "p-4",
      "bg-green-100",
      "text-green-800",
    );
    document.querySelector("#ver-mis-pedidos")?.classList.remove("hidden");
    mensajePedido.textContent = `¡Pedido n.º ${idPedido} confirmado! Podés volver al menú para seguir comprando.`;
  } catch (error) {
    if (error.code === "AUTH_REQUIRED") {
      irAlLogin("/carrito.html");
      return;
    }

    console.error("Error al guardar el pedido:", error);

    mensajePedido.classList.add(
      "rounded-md",
      "p-4",
      "bg-red-100",
      "text-red-800",
    );

    // muestra el motivo si la cuenta está bloqueada
    if (error.message === "Tu cuenta está bloqueada para realizar pedidos") {
      mensajePedido.textContent =
        "Tu cuenta está bloqueada para realizar pedidos. Comunicate con el local.";
    } else {
      mensajePedido.textContent =
        "No se pudo guardar el pedido. Tus productos siguen en el carrito. Intentá nuevamente.";
    }
  } finally {
    guardando = false;
    lista
      .querySelectorAll("button, input")
      .forEach((elemento) => (elemento.disabled = false));
    actualizarTotal();
    botonConfirmar.textContent = "Confirmar pedido";
  }
});

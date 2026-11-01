import { supabase } from './lib/supabase.js';
import { obtenerPedidos, actualizarEstadoPedido } from "./services/pedidos.js";

const listaAcceso = document.querySelector("#lista-comandas-admin");
listaAcceso.textContent = "Verificando acceso...";

async function cargarComandas() {
try {
const pedidos = await obtenerPedidos();
listaAcceso.textContent = "";

// llama los elementos del html
const lista = document.querySelector("#lista-comandas-admin");
const plantilla = document.querySelector("#plantilla-item-comanda-admin");

// mensaje si no hay pedidos
if (pedidos.length === 0) {
  lista.textContent = "No hay pedidos pendientes ni en preparación.";
}

// crea una tarjeta por cada pedido guardado en supabase
for (const pedido of pedidos) {
  const copia = plantilla.content.cloneNode(true); // copia de la plantilla para modificar
  const tarjeta = copia.querySelector("article");

  // completa la tarjeta con los datos del pedido
  copia.querySelector("[data-numero]").textContent =
    `Pedido n.º ${pedido.id_pedido}`;
  copia.querySelector("[data-estado]").textContent = pedido.estado_pedido;

  const listaProductos = copia.querySelector("[data-productos]");

  // agrega los productos y cantidades de este pedido.
  for (const detalle of pedido.detalle_pedido) {
    const item = document.createElement("li");

    item.textContent = `${detalle.cantidad} × ${detalle.producto.nombre}`;

    listaProductos.append(item);
  }

  const botonEstado = copia.querySelector("[data-listo]");
  const textoEstado = copia.querySelector("[data-estado]");

  // ajusta el botón según el estado actual del pedido
  function actualizarBoton() {
    const pendiente = pedido.estado_pedido === "Pendiente";

    botonEstado.textContent = pendiente
      ? "Empezar preparación"
      : "Marcar listo";

    // quita los colores anteriores
    botonEstado.classList.remove(
      "bg-yellow-400",
      "hover:bg-yellow-500",
      "text-gray-900",
      "bg-green-600",
      "hover:bg-green-700",
      "text-white",
    );

    // aplica los colores según la acción disponible
    if (pendiente) {
      botonEstado.classList.add(
        "bg-yellow-400",
        "hover:bg-yellow-500",
        "text-gray-900",
      );
    } else {
      botonEstado.classList.add(
        "bg-green-600",
        "hover:bg-green-700",
        "text-white",
      );
    }
  }

  actualizarBoton();
  botonEstado.disabled = false;

  // avanza el pedido al siguiente estado y evita clics mientras se guarda
  botonEstado.addEventListener("click", async () => {
    const nuevoEstado =
      pedido.estado_pedido === "Pendiente" ? "En preparación" : "Listo";

    const confirmar = window.confirm(
      `¿Confirmás cambiar el pedido n.º ${pedido.id_pedido} de “${pedido.estado_pedido}” a “${nuevoEstado}”?`,
    );
    if (!confirmar) return;

    botonEstado.disabled = true;
    botonEstado.textContent = "Guardando...";

    try {
      const pedidoActualizado = await actualizarEstadoPedido(
        pedido.id_pedido,
        nuevoEstado,
      );

      // actualiza el estado en pantalla después de confirmar el cambio en supabase
      pedido.estado_pedido = pedidoActualizado.estado_pedido;

      if (pedido.estado_pedido === "Listo") {
        tarjeta.remove(); // quita la tarjeta de la pantalla

        if (lista.querySelector("article") === null) {
          lista.textContent = "No hay pedidos pendientes ni en preparación.";
        }
      } else {
        textoEstado.textContent = pedido.estado_pedido;
      }
    } catch (error) {
      console.error("No se pudo actualizar el pedido:", error.message);
      alert("No se pudo cambiar el estado. Intentá nuevamente.");
    } finally {
      botonEstado.disabled = false;
      actualizarBoton();
    }
  });

  // inserta cada plantilla a la lista
  lista.append(copia);
}

} catch (error) {
  listaAcceso.textContent = error.code === 'FORBIDDEN'
    ? error.message
    : 'No se pudieron cargar las comandas. Recargá la página para intentar nuevamente.';
  console.error('No se pudieron cargar las comandas:', error);
}
}

cargarComandas();

supabase.auth.onAuthStateChange((evento) => {
  if (evento === 'SIGNED_OUT') {
    listaAcceso.replaceChildren();
    window.location.reload();
  }
});

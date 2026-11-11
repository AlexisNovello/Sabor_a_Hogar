import { supabase } from "./lib/supabase.js";
import { obtenerPedidos, actualizarEstadoPedido } from "./services/pedidos.js";

// llama los elementos del html
const lista = document.querySelector("#lista-comandas-admin");
const plantilla = document.querySelector("#plantilla-item-comanda-admin");
const botonActualizar = document.querySelector("#actualizar-comandas");

let cargando = false;
let guardandoEstado = false;

// desactiva actualizar mientras se consulta o modifica un pedido
function actualizarBotonConsulta() {
  botonActualizar.disabled = cargando || guardandoEstado;
  botonActualizar.textContent = cargando ? "Actualizando..." : "Actualizar";
}

// carga los pedidos guardados en Supabase
async function cargarComandas() {
  if (cargando || guardandoEstado) {
    return;
  }

  cargando = true;
  actualizarBotonConsulta();

  try {
    const pedidos = await obtenerPedidos();

    // limpia las tarjetas anteriores para no duplicarlas
    lista.replaceChildren();

    if (pedidos.length === 0) {
      lista.textContent = "No hay pedidos pendientes ni en preparación.";
    }

    // crea una tarjeta por cada pedido
    for (const pedido of pedidos) {
      const copia = plantilla.content.cloneNode(true);
      const tarjeta = copia.querySelector("article");

      // completa la tarjeta con los datos del pedido
      copia.querySelector("[data-numero]").textContent =
        `Pedido n.º ${pedido.id_pedido}`;

      const textoEstado = copia.querySelector("[data-estado]");
      textoEstado.textContent = pedido.estado_pedido;

      const listaProductos = copia.querySelector("[data-productos]");

      // agrega los productos y cantidades de este pedido
      for (const detalle of pedido.detalle_pedido || []) {
        const item = document.createElement("li");
        const nombre = detalle.producto?.nombre || "Producto no disponible";

        item.textContent = `${detalle.cantidad} × ${nombre}`;
        listaProductos.append(item);
      }

      const botonEstado = copia.querySelector("[data-listo]");

      // ajusta el botón según el estado actual del pedido
      function actualizarBotonEstado() {
        const pendiente = pedido.estado_pedido === "Pendiente";

        botonEstado.textContent = pendiente
          ? "Empezar preparación"
          : "Marcar listo";

        botonEstado.classList.remove(
          "bg-yellow-400",
          "hover:bg-yellow-500",
          "text-gray-900",
          "bg-green-600",
          "hover:bg-green-700",
          "text-white",
        );

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

      actualizarBotonEstado();
      botonEstado.disabled = false;

      // avanza el pedido al siguiente estado
      botonEstado.addEventListener("click", async () => {
        if (cargando || guardandoEstado) {
          return;
        }

        const nuevoEstado =
          pedido.estado_pedido === "Pendiente" ? "En preparación" : "Listo";

        const confirmar = window.confirm(
          `¿Confirmás cambiar el pedido n.º ${pedido.id_pedido} de “${pedido.estado_pedido}” a “${nuevoEstado}”?`,
        );

        if (!confirmar) {
          return;
        }

        guardandoEstado = true;
        actualizarBotonConsulta();

        // evita modificar otros pedidos mientras se guarda
        lista.querySelectorAll("[data-listo]").forEach((boton) => {
          boton.disabled = true;
        });

        botonEstado.textContent = "Guardando...";

        try {
          const pedidoActualizado = await actualizarEstadoPedido(
            pedido.id_pedido,
            nuevoEstado,
          );

          // actualiza la pantalla después de confirmar el cambio
          pedido.estado_pedido = pedidoActualizado.estado_pedido;

          if (pedido.estado_pedido === "Listo") {
            tarjeta.remove();

            if (lista.querySelector("article") === null) {
              lista.textContent =
                "No hay pedidos pendientes ni en preparación.";
            }
          } else {
            textoEstado.textContent = pedido.estado_pedido;
          }
        } catch (error) {
          console.error("No se pudo actualizar el pedido:", error);
          alert("No se pudo cambiar el estado. Intentá nuevamente.");
        } finally {
          guardandoEstado = false;
          actualizarBotonEstado();
          actualizarBotonConsulta();

          lista.querySelectorAll("[data-listo]").forEach((boton) => {
            boton.disabled = false;
          });
        }
      });

      // inserta cada tarjeta a la lista
      lista.append(copia);
    }
  } catch (error) {
    lista.replaceChildren();

    lista.textContent =
      error.code === "FORBIDDEN"
        ? error.message
        : "No se pudieron cargar las comandas. Presioná Actualizar para intentar nuevamente.";

    console.error("No se pudieron cargar las comandas:", error);
  } finally {
    cargando = false;
    actualizarBotonConsulta();
  }
}

// consulta nuevamente los pedidos al presionar el botón
botonActualizar.addEventListener("click", cargarComandas);

// limpia la pantalla y recarga al cerrar sesión
supabase.auth.onAuthStateChange((evento) => {
  if (evento === "SIGNED_OUT") {
    lista.replaceChildren();
    window.location.reload();
  }
});

cargarComandas();

import { obtenerStock } from "./services/stock.js";
import {
  obtenerReceta,
  agregarIngredienteReceta,
  actualizarCantidadReceta,
  quitarIngredienteReceta,
} from "./services/recetas.js";

// llama los elementos del html
const seccion = document.querySelector("#seccion-receta");
const formulario = document.querySelector("#formulario-receta");
const ingrediente = document.querySelector("#ingrediente-receta");
const cantidad = document.querySelector("#cantidad-receta");
const botonAgregar = document.querySelector("#agregar-ingrediente-receta");
const lista = document.querySelector("#lista-receta");
const plantilla = document.querySelector("#plantilla-ingrediente-receta");
const mensaje = document.querySelector("#mensaje-receta");

let idProducto = null;
let ingredientes = [];
let receta = [];
let ocupado = false;
let cargado = false;

// desactiva los controles mientras se consulta o guarda
function actualizarControles() {
  seccion.querySelectorAll("input, select, button").forEach((elemento) => {
    elemento.disabled = ocupado || !cargado;
  });

  botonAgregar.disabled =
    ocupado || !cargado || ingrediente.options.length <= 1;
}

// muestra los ingredientes que todavía no están en la receta
function cargarOpciones() {
  ingrediente.replaceChildren(new Option("Seleccioná un ingrediente", ""));

  for (const item of ingredientes) {
    const agregado = receta.some(
      (fila) => fila.id_ingrediente === item.id_ingrediente,
    );

    if (!agregado) {
      ingrediente.append(
        new Option(
          `${item.nombre} (${item.unidad_medida})`,
          String(item.id_ingrediente),
        ),
      );
    }
  }
}

// completa la lista de ingredientes de la receta
function mostrarReceta() {
  lista.replaceChildren();
  cargarOpciones();

  if (receta.length === 0) {
    lista.textContent = "El plato todavía no tiene ingredientes asignados.";
  }

  for (const fila of receta) {
    const copia = plantilla.content.cloneNode(true);

    const datos = ingredientes.find(
      (item) => item.id_ingrediente === fila.id_ingrediente,
    );

    copia.querySelector("[data-nombre-ingrediente]").textContent =
      datos?.nombre || "Ingrediente no encontrado";

    copia.querySelector("[data-unidad-ingrediente]").textContent = datos
      ? `Unidad: ${datos.unidad_medida}`
      : "";

    const inputCantidad = copia.querySelector("[data-cantidad-ingrediente]");
    const botonGuardar = copia.querySelector("[data-guardar-ingrediente]");
    const botonQuitar = copia.querySelector("[data-quitar-ingrediente]");

    inputCantidad.value = fila.cantidad_necesaria;

    // guarda una nueva cantidad por porción
    botonGuardar.addEventListener("click", () => {
      if (!inputCantidad.reportValidity()) {
        return;
      }

      guardarCambio(async () => {
        const actualizado = await actualizarCantidadReceta(
          idProducto,
          fila.id_receta,
          inputCantidad.value,
        );

        fila.cantidad_necesaria = actualizado.cantidad_necesaria;
      });
    });

    // quita el ingrediente solamente de esta receta
    botonQuitar.addEventListener("click", () => {
      if (ocupado) {
        return;
      }

      const confirmar = window.confirm(
        `¿Querés quitar ${datos?.nombre || "este ingrediente"} de la receta?`,
      );

      if (!confirmar) {
        return;
      }

      guardarCambio(async () => {
        await quitarIngredienteReceta(idProducto, fila.id_receta);

        receta = receta.filter((item) => item.id_receta !== fila.id_receta);
      });
    });

    lista.append(copia);
  }
}

// ejecuta un cambio y actualiza la pantalla después de guardarlo
async function guardarCambio(operacion) {
  if (ocupado || !cargado) {
    return;
  }

  ocupado = true;
  mensaje.textContent = "";
  actualizarControles();

  try {
    await operacion();
    mostrarReceta();
    mensaje.textContent = "Receta actualizada.";
  } catch (error) {
    console.error("Error al guardar la receta:", error);
    mensaje.textContent = "No se pudo guardar: " + error.message;
  } finally {
    ocupado = false;
    actualizarControles();
  }
}

// agrega el ingrediente seleccionado a la receta
formulario.addEventListener("submit", (evento) => {
  evento.preventDefault();

  if (ocupado || !cargado || !formulario.reportValidity()) {
    return;
  }

  const idIngrediente = Number(ingrediente.value);

  // evita agregar dos veces el mismo ingrediente desde esta pantalla
  if (receta.some((fila) => fila.id_ingrediente === idIngrediente)) {
    mensaje.textContent = "Ese ingrediente ya está en la receta.";
    return;
  }

  guardarCambio(async () => {
    const agregado = await agregarIngredienteReceta(
      idProducto,
      idIngrediente,
      cantidad.value,
    );

    receta.push(agregado);
    formulario.reset();
  });
});

// muestra la receta cuando el plato ya está guardado
export async function iniciarReceta(id) {
  if (!id || ocupado || (cargado && idProducto === String(id))) {
    return;
  }

  idProducto = String(id);
  cargado = false;
  ocupado = true;

  seccion.classList.remove("hidden");
  mensaje.textContent = "Cargando receta...";
  actualizarControles();

  try {
    ingredientes = await obtenerStock();
    receta = await obtenerReceta(idProducto);

    mostrarReceta();
    cargado = true;

    mensaje.textContent = ingredientes.length
      ? ""
      : "Primero agregá ingredientes desde Control de Stock.";
  } catch (error) {
    lista.replaceChildren();
    console.error("Error al cargar la receta:", error);
    mensaje.textContent = "No se pudo cargar la receta. Recargá la página.";
  } finally {
    ocupado = false;
    actualizarControles();
  }
}

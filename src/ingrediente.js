import { agregarIngrediente } from "./services/stock.js";

// llama los elementos del formulario
const formulario = document.querySelector("#formulario-ingrediente");
const nombre = document.querySelector("#nombre");
const unidad = document.querySelector("#unidad");
const cantidad = document.querySelector("#cantidad");
const botonGuardar = formulario.querySelector("button[type='submit']");

// cuando se envía el formulario, guarda el ingrediente
formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  // evita guardar un nombre compuesto solamente por espacios
  const nombreIngrediente = nombre.value.trim();

  if (nombreIngrediente === "") {
    alert("Ingresá el nombre del ingrediente.");
    return;
  }

  // evita enviar el formulario varias veces mientras se guarda
  botonGuardar.disabled = true;

  try {
    await agregarIngrediente(
      nombreIngrediente,
      unidad.value,
      Number(cantidad.value),
    );

    window.location.href = "admin-stock.html";
  } catch (error) {
    console.error("Error al guardar el ingrediente:", error);
    alert("No se pudo guardar el ingrediente. Intentá nuevamente.");
  } finally {
    botonGuardar.disabled = false;
  }
});

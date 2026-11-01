import { obtenerStock, actualizarCantidad } from "./services/stock.js";

const ingredientes = await obtenerStock();

// llama los elementos del html
const tabla = document.querySelector("#tabla-ingredientes");
const plantilla = document.querySelector("#plantilla-fila-ingrediente");
const mensaje = document.querySelector("#mensaje-stock");

// mensaje si no hay ingredientes cargados
if (ingredientes.length === 0) {
  mensaje.textContent = "No hay ingredientes cargados.";
}

// formato de las cantidades
const formatoCantidad = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 2,
});

// crea una fila por cada ingrediente recibido de Supabase
for (const ingrediente of ingredientes) {
  const copia = plantilla.content.cloneNode(true);

  // completa la fila con el nombre, la unidad y la cantidad
  copia.querySelector("[data-nombre-ingrediente]").textContent =
    `${ingrediente.nombre} (${ingrediente.unidad_medida})`;

  copia.querySelector("[data-cantidad-ingrediente]").textContent =
    formatoCantidad.format(ingrediente.cantidad_stock);

  // busca los botones y la celda de cantidad de esta fila
  const botonSumar = copia.querySelector("[data-sumar]");
  const botonRestar = copia.querySelector("[data-restar]");
  const celdaCantidad = copia.querySelector("[data-cantidad-ingrediente]");

  // suma o descuenta la cantidad ingresada
  async function modificarStock(accion) {
    const entrada = prompt(
      `Cantidad a ${accion} de ${ingrediente.nombre} (${ingrediente.unidad_medida}):`,
    );

    // si cancela la ventana, no hacemos cambios
    if (entrada === null) {
      return;
    }

    const cantidad = Number(entrada.replace(",", "."));

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      alert("Ingresá un número mayor que cero.");
      return;
    }

    const cantidadActual = Number(ingrediente.cantidad_stock);
    let nuevaCantidad;

    if (accion === "sumar") {
      nuevaCantidad = cantidadActual + cantidad;
    } else {
      nuevaCantidad = cantidadActual - cantidad;
    }

    if (nuevaCantidad < 0) {
      alert("No podés descontar más de lo que hay en stock.");
      return;
    }

    // redondea a dos decimales
    nuevaCantidad = Number(nuevaCantidad.toFixed(2));

    botonSumar.disabled = true;
    botonRestar.disabled = true;

    try {
      const actualizado = await actualizarCantidad(
        ingrediente.id_ingrediente,
        cantidadActual,
        nuevaCantidad,
      );

      // actualiza los datos y la pantalla después de guardar
      ingrediente.cantidad_stock = actualizado.cantidad_stock;
      celdaCantidad.textContent = formatoCantidad.format(
        actualizado.cantidad_stock,
      );
    } catch (error) {
      console.error("Error al actualizar el stock:", error);
      alert(
        "No se pudo actualizar el stock. Recargá la página e intentá nuevamente.",
      );
    } finally {
      botonSumar.disabled = false;
      botonRestar.disabled = false;
    }
  }

  // ambos botones usan la misma función
  botonSumar.addEventListener("click", () => modificarStock("sumar"));
  botonRestar.addEventListener("click", () => modificarStock("descontar"));

  // inserta la fila en la tabla
  tabla.append(copia);
}

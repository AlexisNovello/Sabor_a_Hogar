import {
  obtenerStock,
  actualizarCantidad,
  actualizarNombreIngrediente,
  eliminarIngrediente,
} from "./services/stock.js";

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

  // busca las celdas y los botones de esta fila
  const celdaNombre = copia.querySelector("[data-nombre-ingrediente]");
  const celdaCantidad = copia.querySelector("[data-cantidad-ingrediente]");
  const botonEditar = copia.querySelector("[data-editar-nombre]");
  const botonSumar = copia.querySelector("[data-sumar]");
  const botonRestar = copia.querySelector("[data-restar]");
  const botonEliminar = copia.querySelector("[data-eliminar-ingrediente]");
  const filaIngrediente = copia.querySelector("tr");

  let guardando = false;

  // completa la fila con el nombre, la unidad y la cantidad
  celdaNombre.textContent = `${ingrediente.nombre} (${ingrediente.unidad_medida})`;
  celdaCantidad.textContent = formatoCantidad.format(
    ingrediente.cantidad_stock,
  );

  // evita realizar dos cambios al mismo tiempo en esta fila
  function cambiarEstadoBotones(ocupado) {
    guardando = ocupado;
    botonEditar.disabled = ocupado;
    botonSumar.disabled = ocupado;
    botonRestar.disabled = ocupado;
    botonEliminar.disabled = ocupado;
  }

  // permite corregir el nombre del ingrediente
  botonEditar.addEventListener("click", async () => {
    if (guardando) {
      return;
    }

    const entrada = prompt("Nuevo nombre del ingrediente:", ingrediente.nombre);
    if (entrada === null) {
      return;
    }

    const nuevoNombre = entrada.trim();
    if (nuevoNombre === "") {
      alert("Ingresá el nombre del ingrediente.");
      return;
    }
    if (nuevoNombre === ingrediente.nombre) {
      return;
    }

    cambiarEstadoBotones(true);
    try {
      const actualizado = await actualizarNombreIngrediente(
        ingrediente.id_ingrediente,
        nuevoNombre,
      );

      // actualiza el nombre después de confirmar el guardado
      ingrediente.nombre = actualizado.nombre;
      celdaNombre.textContent = `${ingrediente.nombre} (${ingrediente.unidad_medida})`;
    } catch (error) {
      console.error("Error al editar el ingrediente:", error);
      alert("No se pudo actualizar el nombre. Intentá nuevamente.");
    } finally {
      cambiarEstadoBotones(false);
    }
  });

  // suma o descuenta la cantidad ingresada
  async function modificarStock(accion) {
    if (guardando) {
      return;
    }

    const entrada = prompt(
      `Cantidad a ${accion} de ${ingrediente.nombre} (${ingrediente.unidad_medida}):`,
    );

    // si cancela la ventana, no hacemos cambios
    if (entrada === null) {
      return;
    }

    const cantidad = Number(entrada.replace(",", "."));
    const centesimas = cantidad * 100;
    if (
      !Number.isFinite(cantidad) ||
      cantidad <= 0 ||
      cantidad > 99999999.99 ||
      Math.abs(centesimas - Math.round(centesimas)) > 0.000001
    ) {
      alert("Ingresá un número mayor que cero, con hasta dos decimales.");
      return;
    }

    const cantidadActual = Number(ingrediente.cantidad_stock);
    let nuevaCantidad =
      accion === "sumar"
        ? cantidadActual + cantidad
        : cantidadActual - cantidad;

    // redondea a dos decimales
    nuevaCantidad = Number(nuevaCantidad.toFixed(2));
    if (nuevaCantidad < 0) {
      alert("No podés descontar más de lo que hay en stock.");
      return;
    }
    if (nuevaCantidad > 99999999.99) {
      alert("La cantidad supera el máximo permitido.");
      return;
    }

    cambiarEstadoBotones(true);
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
      cambiarEstadoBotones(false);
    }
  }

  // ambos botones usan la misma función
  botonSumar.addEventListener("click", () => modificarStock("sumar"));
  botonRestar.addEventListener("click", () => modificarStock("descontar"));

  // elimina el ingrediente después de confirmar
  botonEliminar.addEventListener("click", async () => {
    if (guardando) {
      return;
    }
    const confirmar = window.confirm(
      `¿Querés eliminar ${ingrediente.nombre}? Se borrará también su registro de stock, que actualmente tiene ${formatoCantidad.format(ingrediente.cantidad_stock)} ${ingrediente.unidad_medida}.`,
    );
    if (!confirmar) {
      return;
    }

    cambiarEstadoBotones(true);
    try {
      await eliminarIngrediente(ingrediente.id_ingrediente);

      // quita la fila solamente después de confirmar la eliminación
      filaIngrediente.remove();
      if (tabla.querySelector("tr") === null) {
        mensaje.textContent = "No hay ingredientes cargados.";
      }
    } catch (error) {
      console.error("Error al eliminar el ingrediente:", error);
      alert("No se pudo eliminar. " + error.message);
    } finally {
      cambiarEstadoBotones(false);
    }
  });

  // inserta la fila en la tabla
  tabla.append(copia);
}

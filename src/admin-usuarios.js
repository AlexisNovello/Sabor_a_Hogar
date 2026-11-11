import { obtenerUsuarios, actualizarBloqueo } from "./services/usuarios.js";

// llama los elementos del html
const lista = document.querySelector("#lista-usuarios-admin");
const plantilla = document.querySelector("#plantilla-usuario-admin");

async function cargarUsuarios() {
  try {
    const usuarios = await obtenerUsuarios();

    // limpia la lista antes de cargar los usuarios
    lista.replaceChildren();

    // crea una tarjeta por cada usuario recibido de Supabase
    for (const usuario of usuarios) {
      const copia = plantilla.content.cloneNode(true);

      // completa la tarjeta con los datos del usuario
      copia.querySelector("[data-nombre-usuario]").textContent =
        `${usuario.nombre ?? ""} ${usuario.apellido ?? ""}`.trim();

      copia.querySelector("[data-email-usuario]").textContent =
        usuario.email || "Sin correo";

      copia.querySelector("[data-rol-usuario]").textContent =
        `Rol: ${usuario.rol || "Sin asignar"}`;

      copia.querySelector("[data-dni-usuario]").textContent = usuario.dni;

      copia.querySelector("[data-telefono-usuario]").textContent =
        usuario.telefono || "Sin teléfono";

      copia.querySelector("[data-direccion-usuario]").textContent =
        usuario.direccion || "Sin dirección";

      // busca los botones y los contenedores de la tarjeta
      const botonVerDatos = copia.querySelector("[data-ver-datos]");
      const datosUsuario = copia.querySelector("[data-datos-usuario]");
      const botonBloquear = copia.querySelector("[data-bloquear-usuario]");
      const estadoUsuario = copia.querySelector("[data-estado-usuario]");

      // muestra u oculta los datos del usuario
      botonVerDatos.addEventListener("click", () => {
        const oculto = datosUsuario.classList.toggle("hidden");

        botonVerDatos.textContent = oculto
          ? "Ver los datos"
          : "Ocultar los datos";

        botonVerDatos.setAttribute("aria-expanded", String(!oculto));
      });

      // actualiza el estado y el botón según el bloqueo guardado
      function actualizarBoton() {
        estadoUsuario.textContent = usuario.bloqueado
          ? "Estado: Bloqueado"
          : "Estado: Activo";

        estadoUsuario.classList.toggle("text-red-700", usuario.bloqueado);
        estadoUsuario.classList.toggle("text-green-700", !usuario.bloqueado);

        botonBloquear.textContent = usuario.bloqueado
          ? "Desbloquear cuenta"
          : "Bloquear cuenta";

        botonBloquear.classList.toggle("bg-green-700", usuario.bloqueado);
        botonBloquear.classList.toggle("hover:bg-green-800", usuario.bloqueado);
        botonBloquear.classList.toggle("bg-red-600", !usuario.bloqueado);
        botonBloquear.classList.toggle("hover:bg-red-700", !usuario.bloqueado);
      }

      actualizarBoton();

      // muestra el botón solamente para las cuentas de clientes
      if (usuario.rol === "cliente") {
        botonBloquear.classList.remove("hidden");

        botonBloquear.addEventListener("click", async () => {
          if (botonBloquear.disabled) {
            return;
          }

          const nuevoBloqueo = !usuario.bloqueado;

          botonBloquear.disabled = true;
          botonBloquear.textContent = "Guardando...";

          try {
            const actualizado = await actualizarBloqueo(
              usuario.dni,
              nuevoBloqueo,
            );

            // actualiza la tarjeta después de confirmar el cambio
            usuario.bloqueado = actualizado.bloqueado;
          } catch (error) {
            console.error("Error al actualizar el bloqueo:", error);
          } finally {
            actualizarBoton();
            botonBloquear.disabled = false;
          }
        });
      }

      // inserta cada tarjeta a la lista
      lista.append(copia);
    }
  } catch (error) {
    console.error("Error al cargar los usuarios:", error);
  }
}

cargarUsuarios();

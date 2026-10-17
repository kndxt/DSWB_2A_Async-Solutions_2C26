
/**
 * Oculta y limpia los mensajes de éxito y error.
 */
export function limpiarMensajes(mensajeExito, mensajeError) {
  mensajeExito.hidden = true;
  mensajeError.hidden = true;

  mensajeExito.querySelector(".texto-mensaje").textContent = "";
  mensajeError.querySelector(".texto-mensaje").textContent = "";
}

/**
 * Muestra un mensaje de éxito.
 */
export function mostrarExito(elemento, mensaje) {
  elemento.querySelector(".texto-mensaje").textContent = mensaje;
  elemento.hidden = false;
}

/**
 * Muestra un mensaje de error.
 */
export function mostrarError(elemento, mensaje) {
  elemento.querySelector(".texto-mensaje").textContent = mensaje;
  elemento.hidden = false;
}

/**
 * Permite cerrar los mensajes manualmente.
 */
export function configurarCierreMensajes() {
  document.querySelectorAll(".cerrar-mensaje").forEach((boton) => {
    boton.addEventListener("click", () => {
      const mensaje = boton.closest(".mensaje");

      mensaje.hidden = true;
      mensaje.querySelector(".texto-mensaje").textContent = "";
    });
  });
}

import { apiFetch } from "./apiClient.js";

const formulario = document.querySelector("#form-registro");
const contenedorMensaje = document.querySelector("#mensaje-registro");
const botonRegistro = document.querySelector("#btn-registro");

const mostrarMensaje = (tipo, texto) => {
  const mensaje = document.createElement("p");
  mensaje.className =
    tipo === "error" ? "mensaje mensaje-error" : "mensaje mensaje-exito";
  mensaje.setAttribute("role", tipo === "error" ? "alert" : "status");
  mensaje.textContent = texto;
  contenedorMensaje.replaceChildren(mensaje);
};

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const datos = {
    nombre: formulario.elements.nombre.value.trim(),
    apellido: formulario.elements.apellido.value.trim(),
    email: formulario.elements.email.value.trim(),
    telefono: formulario.elements.telefono.value.trim(),
    password: formulario.elements.password.value,
  };

  botonRegistro.disabled = true;
  mostrarMensaje("exito", "Creando cuenta...");

  try {
    await apiFetch("/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });

    mostrarMensaje("exito", "Cuenta creada. Redirigiendo al inicio de sesión...");
    setTimeout(() => {
      window.location.href = "/vistas/login";
    }, 1500);
  } catch (error) {
    mostrarMensaje("error", error.message || "No se pudo crear la cuenta.");
  } finally {
    botonRegistro.disabled = false;
  }
});
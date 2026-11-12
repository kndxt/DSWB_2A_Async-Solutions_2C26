import { apiFetch, enviarJson } from "../core/apiClient.js";
import { mostrarMensaje as mostrar } from "../core/mensajes.js";

const formulario = document.querySelector("#form-login");
const contenedorMensaje = document.querySelector("#mensaje-login");
const botonLogin = document.querySelector("#btn-login");
const mostrarMensaje = (tipo, texto) => mostrar(tipo, texto, contenedorMensaje);

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const email = formulario.elements.email.value.trim();
  const password = formulario.elements.password.value;

  botonLogin.disabled = true;
  mostrarMensaje("exito", "Validando credenciales...");

  try {
    await apiFetch("/usuarios/login", enviarJson("POST", { email, password }));

    mostrarMensaje("exito", "Inicio de sesión exitoso. Redirigiendo...");
    setTimeout(() => {
      window.location.href = "/vistas/inicio";
    }, 1000);
  } catch (error) {
    mostrarMensaje("error", error.message || "No se pudo iniciar sesión.");
  } finally {
    botonLogin.disabled = false;
  }
});

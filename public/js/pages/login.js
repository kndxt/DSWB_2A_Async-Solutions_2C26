import { usuariosApi } from "../api/usuariosApi.js";
import { mostrarMensaje } from "../core/mensajes.js";

const formulario = document.querySelector("#form-login");
const botonLogin = document.querySelector("#btn-login");

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const email = formulario.elements.email.value.trim();
  const password = formulario.elements.password.value;

  botonLogin.disabled = true;
  mostrarMensaje("exito", "Validando credenciales...");

  try {
    await usuariosApi.login(email, password);

    mostrarMensaje("exito", "Inicio de sesión exitoso. Redirigiendo...");
    setTimeout(() => {
      window.location.href = "/vistas/inicio";
    }, 1000);
  } catch (error) {
    mostrarMensaje("error", error.message || "No se pudo iniciar sesión.");
    botonLogin.disabled = false;
  }
});

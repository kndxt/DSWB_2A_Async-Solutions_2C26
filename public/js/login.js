import { apiFetch } from "./apiClient.js";

const formulario = document.querySelector("#form-login");
const contenedorMensaje = document.querySelector("#mensaje-login");
const botonLogin = document.querySelector("#btn-login");

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

  const email = formulario.elements.email.value.trim();
  const password = formulario.elements.password.value;

  botonLogin.disabled = true;
  mostrarMensaje("exito", "Validando credenciales...");

  try {
    const respuesta = await apiFetch("/usuarios/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    mostrarMensaje("exito", respuesta.mensaje || "Inicio de sesión exitoso.");

    formulario.reset();

    const botonContinuar = document.createElement("a");
    botonContinuar.href = "/vistas/inicio";
    botonContinuar.className = "boton";
    botonContinuar.textContent = "Continuar al inicio";

    contenedorMensaje.append(botonContinuar);
  } catch (error) {
    mostrarMensaje(
      "error",
      error.message || "No se pudo iniciar sesión. Intentá nuevamente.",
    );
  } finally {
    botonLogin.disabled = false;
  }
});

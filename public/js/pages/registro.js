import { mostrarMensaje } from "../core/mensajes.js";
import { usuariosApi } from "../api/usuariosApi.js";

const formulario = document.querySelector("#form-registro");
const botonRegistro = document.querySelector("#btn-registro");

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
    await usuariosApi.crear(datos);

    mostrarMensaje("exito", "Cuenta creada. Redirigiendo al inicio de sesión...");
    setTimeout(() => {
      window.location.href = "/vistas/login";
    }, 1500);
  } catch (error) {
    mostrarMensaje("error", error.message || "No se pudo crear la cuenta.");
    botonRegistro.disabled = false;
  }
});

import { usuariosApi } from "../api/usuariosApi.js";

const boton = document.querySelector("#btn-logout");

if (boton) {
  boton.addEventListener("click", async () => {
    boton.disabled = true;
    try {
      await await usuariosApi.logout();
    } catch {
      // Si falla, igual redirigimos: la cookie se limpia del lado del cliente.
    } finally {
      window.location.href = "/vistas/inicio";
    }
  });
}

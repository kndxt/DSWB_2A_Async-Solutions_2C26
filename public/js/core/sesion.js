import { apiFetch } from "./apiClient.js";

const boton = document.querySelector("#btn-logout");

if (boton) {
  boton.addEventListener("click", async () => {
    boton.disabled = true;
    try {
      await apiFetch("/usuarios/logout", { method: "POST" });
    } catch {
      // Si falla, igual redirigimos: la cookie se limpia del lado del cliente.
    } finally {
      window.location.href = "/vistas/inicio";
    }
  });
}
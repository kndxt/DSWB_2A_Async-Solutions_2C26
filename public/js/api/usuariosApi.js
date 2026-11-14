import { apiFetch, enviarJson } from "../core/apiClient.js";

export const usuariosApi = {
  listar: () => apiFetch("/usuarios"),
  obtener: (id) => apiFetch(`/usuarios/${id}`),
  crear: (datos) => apiFetch("/usuarios", enviarJson("POST", datos)),
  actualizar: (id, datos) => apiFetch(`/usuarios/${id}`, enviarJson("PUT", datos)),
  cambiarEstado: (id, estado) =>
    apiFetch(`/usuarios/${id}/estado`, enviarJson("PATCH", { estado })),
  cambiarRol: (id, rol) => apiFetch(`/usuarios/${id}/rol`, enviarJson("PATCH", { rol })),
  login: (email, password) => apiFetch("/usuarios/login", enviarJson("POST", { email, password })),
  logout: () => apiFetch("/usuarios/logout", { method: "POST" }),
};

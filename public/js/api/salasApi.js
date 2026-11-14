// public/js/api/salasApi.js
import { apiFetch, enviarJson } from "../core/apiClient.js";

export const salasApi = {
  listar: () => apiFetch("/salas"),
  obtener: (id) => apiFetch(`/salas/${id}`),
  crear: (datos) => apiFetch("/salas", enviarJson("POST", datos)),
  actualizar: (id, datos) => apiFetch(`/salas/${id}`, enviarJson("PATCH", datos)),
};

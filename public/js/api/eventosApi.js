import { apiFetch, enviarJson } from "../core/apiClient.js";

export const eventosApi = {
  listar: () => apiFetch("/eventos"),
  proximos: () => apiFetch("/eventos/proximos"),
  obtener: (id) => apiFetch(`/eventos/${id}`),
  crear: (datos) => apiFetch("/eventos", enviarJson("POST", datos)),
  actualizar: (id, datos) => apiFetch(`/eventos/${id}`, enviarJson("PATCH", datos)),
};

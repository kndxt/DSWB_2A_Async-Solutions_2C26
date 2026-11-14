import { apiFetch, enviarJson } from "../core/apiClient.js";

export const entradasApi = {
  listar: () => apiFetch("/entradas"),
  vender: (datos) => apiFetch("/entradas", enviarJson("POST", datos)),
  cancelar: (id) => apiFetch(`/entradas/${id}/cancelar`, { method: "PATCH" }),
};

import { apiFetch } from "../core/apiClient.js";

export const reservasApi = {
  listar: () => apiFetch("/reservas"),
};

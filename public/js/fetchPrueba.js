
import { apiFetch } from "./apiClient.js";
import { renderTable } from "./tabla.js";

const estado = document.querySelector("#estado");
const tabla = document.querySelector("#tabla-entradas");

const columnas = [
  { label: "ID", value: (entrada) => entrada._id },
  { label: "Evento", value: (entrada) => entrada.eventoId },
  { label: "Usuario", value: (entrada) => entrada.usuarioId },
  { label: "Estado", value: (entrada) => entrada.estado },
  {
    label: "Fecha de venta",
    value: (entrada) =>
      entrada.fechaVenta
        ? new Date(entrada.fechaVenta).toLocaleString("es-AR")
        : "",
  },
];

async function cargarEntradas() {
  try {
    const entradas = await apiFetch("/entradas");

    if (!Array.isArray(entradas) || entradas.length === 0) {
      estado.textContent = "No hay entradas para mostrar.";
      return;
    }

    renderTable(tabla, columnas, entradas);

    estado.textContent = `Entradas encontradas: ${entradas.length}`;
    tabla.hidden = false;
  } catch (error) {
    estado.textContent =
      `No se pudieron cargar las entradas: ${error.message}`;
    estado.setAttribute("role", "alert");
  }
}

cargarEntradas();

// Vista de Reservas: solo consulta sobre la API /reservas.
// Usa apiFetch (apiClient.js) y renderTable (tabla.js) compartidos de F5.1.

import { apiFetch } from "../core/apiClient.js";
import { renderTable } from "../utils/tabla.js";
import { textoOGuion, formatearPrecio, formatearFecha } from "../utils/formato.js";
import { mostrarMensaje, limpiarMensajes } from "../core/mensajes.js";

const reservasApi = {
  listar: () => apiFetch("/reservas"),
};

const COLUMNAS = [
  {
    label: "Usuario",
    value: (r) => {
      const u = r.usuario;
      if (!u) return "—";
      return `${textoOGuion(u.nombre)} ${textoOGuion(u.apellido)}`.trim();
    },
  },
  { label: "Evento", value: (r) => textoOGuion(r.evento?.nombre) },
  { label: "Fecha del evento", value: (r) => formatearFecha(r.evento?.fecha) },
  { label: "Fecha de reserva", value: (r) => formatearFecha(r.fechaReserva) },
  { label: "Precio registrado", value: (r) => formatearPrecio(r.precioFinal) },
];

const tabla = document.getElementById("tabla-reservas");
const cuerpoTabla = tabla.querySelector("tbody");

// ---- Tabla ----
const mostrarEnTabla = (texto) => {
  renderTable(tabla, COLUMNAS, []);
  const fila = document.createElement("tr");
  const celda = document.createElement("td");
  celda.className = "vacio";
  celda.colSpan = COLUMNAS.length;
  celda.textContent = texto;
  fila.append(celda);
  cuerpoTabla.replaceChildren(fila);
};

// ---- Carga ----
const cargarReservas = async () => {
  try {
    const reservas = await reservasApi.listar();

    if (!Array.isArray(reservas) || reservas.length === 0) {
      mostrarEnTabla("No hay reservas registradas.");
      return;
    }

    renderTable(tabla, COLUMNAS, reservas);
  } catch (error) {
    mostrarEnTabla("No se pudieron cargar las reservas.");
    mostrarMensaje("error", error.message);
  }
};

// ---- Inicio ----
const iniciar = () => {
  limpiarMensajes();
  mostrarEnTabla("Cargando reservas...");
  cargarReservas();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciar);
} else {
  iniciar();
}

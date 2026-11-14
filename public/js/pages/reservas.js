import { renderTable, mostrarMensajeEnTabla } from "../utils/tabla.js";
import { alCargarDOM } from "../utils/dom.js";
import {
  textoOGuion,
  formatearPrecio,
  formatearFecha,
  formatearFechaHora,
} from "../utils/formato.js";
import { mostrarMensaje, limpiarMensajes } from "../core/mensajes.js";
import { reservasApi } from "../api/reservasApi.js";
import { esAdmin } from "../core/rol.js";

const COLUMNAS = [
  {
    label: "Titular",
    value: (r) => {
      const u = r.usuario;
      if (!u) return "—";
      return `${textoOGuion(u.nombre)} ${textoOGuion(u.apellido)}`.trim();
    },
  },
  { label: "Evento", value: (r) => textoOGuion(r.evento?.nombre) },
  { label: "Estado del evento", value: (r) => textoOGuion(r.evento?.estado) },
  { label: "Fecha del evento", value: (r) => formatearFechaHora(r.evento?.fecha) },
  { label: "Fecha de reserva", value: (r) => formatearFecha(r.fechaReserva) },
  { label: "Precio registrado", value: (r) => formatearPrecio(r.precioFinal) },
];

// Solo el administrador la ve, y únicamente si la API devuelve el dato.
const COLUMNA_REGISTRADA_POR = {
  label: "Registrada por",
  value: (r) => {
    const registrante = r.registradaPor;
    if (!registrante) return "—";
    return `${textoOGuion(registrante.nombre)} ${registrante.apellido ?? ""}`.trim();
  },
};

const columnasPara = (reservas) =>
  esAdmin() && reservas.some((r) => r.registradaPor)
    ? [...COLUMNAS, COLUMNA_REGISTRADA_POR]
    : COLUMNAS;

const tabla = document.getElementById("tabla-reservas");

// Muestra un texto (cargando, vacío o error) ocupando todo el ancho de la tabla.
const mostrarEnTabla = (texto) => mostrarMensajeEnTabla(tabla, COLUMNAS, texto);

// ---- Carga ----
const cargarReservas = async () => {
  try {
    const reservas = await reservasApi.listar();

    if (!Array.isArray(reservas) || reservas.length === 0) {
      mostrarEnTabla("No hay reservas registradas.");
      return;
    }

    renderTable(tabla, columnasPara(reservas), reservas);
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

alCargarDOM(iniciar);

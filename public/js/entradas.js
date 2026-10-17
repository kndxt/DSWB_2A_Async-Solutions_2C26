
import { apiFetch } from "./apiClient.js";
import { renderTable } from "./tabla.js";
import {
  limpiarMensajes,
  mostrarExito,
  mostrarError,
  configurarCierreMensajes,
} from "./mensajes.js";

// ========================================
// Elementos del DOM
// ========================================

const formVenta = document.querySelector("#form-venta");
const campoEventoId = document.querySelector("#eventoId");
const campoUsuarioId = document.querySelector("#usuarioId");
const botonVender = document.querySelector("#boton-vender");

const tabla = document.querySelector("#tabla-entradas");
const estado = document.querySelector("#estado");
const mensajeExito = document.querySelector("#mensaje-exito");
const mensajeError = document.querySelector("#mensaje-error");

// ========================================
// Estado de la vista
// ========================================

let entradas = [];

// ========================================
// Comunicación con la API
// ========================================

const entradasApi = {
  listar: () => apiFetch("/entradas"),

  vender: (datos) =>
    apiFetch("/entradas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(datos),
    }),

  cancelar: (id) =>
    apiFetch(`/entradas/${id}/cancelar`, {
      method: "PATCH",
    }),
};

// ========================================
// Utilidades
// ========================================

function obtenerId(referencia) {
  if (referencia && typeof referencia === "object") {
    return referencia._id ?? referencia.id;
  }

  return referencia;
}

function renderizarNombreEId(celda, nombre, id) {
  const nombreElemento = document.createElement("strong");
  nombreElemento.textContent = nombre || "No disponible";

  const idElemento = document.createElement("small");
  idElemento.textContent = `ID: ${id ?? "No disponible"}`;

  celda.append(nombreElemento, idElemento);
}

// ========================================
// Configuración de la tabla
// ========================================

const columnas = [
  {
    label: "Entrada",
    render: (celda, entrada) => {
      const id = obtenerId(entrada);
      const indice = entradas.findIndex(
        (item) => String(obtenerId(item)) === String(id)
      );

      renderizarNombreEId(celda, `Entrada ${indice + 1}`, id);
    },
  },
  {
    label: "Evento",
    render: (celda, entrada) => {
      const evento = entrada.eventoId;

      renderizarNombreEId(
        celda,
        evento?.nombre,
        obtenerId(evento)
      );
    },
  },
  {
    label: "Usuario",
    render: (celda, entrada) => {
      const usuario = entrada.usuarioId;

      const nombreCompleto = usuario
        ? `${usuario.nombre ?? ""} ${usuario.apellido ?? ""}`.trim()
        : "";

      renderizarNombreEId(
        celda,
        nombreCompleto,
        obtenerId(usuario)
      );
    },
  },
  {
    label: "Estado",
    value: (entrada) => entrada.estado,
  },
  {
    label: "Fecha de venta",
    value: (entrada) =>
      entrada.fechaVenta
        ? new Date(entrada.fechaVenta).toLocaleString("es-AR")
        : "",
  },
  {
    label: "Acciones",
    render: (celda, entrada) => {
      if (entrada.estado !== "vendida") {
        celda.textContent = "—";
        return;
      }

      const boton = document.createElement("button");
      boton.type = "button";
      boton.textContent = "Cancelar";

      boton.addEventListener("click", () => {
        cancelarEntrada(obtenerId(entrada));
      });

      celda.appendChild(boton);
    },
  },
];

// ========================================
// Renderizado y carga de entradas
// ========================================

function renderizarEntradas() {
  renderTable(tabla, columnas, entradas);

  estado.textContent =
    entradas.length === 0
      ? "No hay entradas registradas."
      : `Entradas registradas: ${entradas.length}`;
}

async function cargarEntradas() {
  estado.textContent = "Cargando entradas...";

  try {
    const resultado = await entradasApi.listar();

    if (!Array.isArray(resultado)) {
      throw new Error("La API devolvió un formato de entradas inesperado.");
    }

    entradas = [...resultado].reverse();
    renderizarEntradas();

    return true;
  } catch (error) {
    estado.textContent = "No se pudieron cargar las entradas.";
    mostrarError(mensajeError, error.message);

    return false;
  }
}

// ========================================
// Operaciones de entradas
// ========================================

async function venderEntrada(event) {
  event.preventDefault();
  limpiarMensajes(mensajeExito, mensajeError);

  const eventoId = campoEventoId.value.trim();
  const usuarioId = campoUsuarioId.value.trim();

  botonVender.disabled = true;

  try {
    await entradasApi.vender({ eventoId, usuarioId });

    formVenta.reset();

    const cargaCorrecta = await cargarEntradas();

    if (cargaCorrecta) {
      mostrarExito(mensajeExito, "La entrada se vendió correctamente.");
    }
  } catch (error) {
    mostrarError(mensajeError, error.message);
  } finally {
    botonVender.disabled = false;
  }
}

async function cancelarEntrada(id) {
  const confirmar = window.confirm(
    "¿Estás segura de que querés cancelar esta entrada?"
  );

  if (!confirmar) {
    return;
  }

  limpiarMensajes(mensajeExito, mensajeError);

  try {
    const entradaCancelada = await entradasApi.cancelar(id);

    entradas = entradas.map((entrada) =>
      String(obtenerId(entrada)) === String(id)
        ? { ...entrada, estado: entradaCancelada.estado }
        : entrada
    );

    renderizarEntradas();
    mostrarExito(mensajeExito, "La entrada se canceló correctamente.");
  } catch (error) {
    mostrarError(mensajeError, error.message);
  }
}

// ========================================
// Inicialización y eventos
// ========================================

formVenta.addEventListener("submit", venderEntrada);

configurarCierreMensajes();
cargarEntradas();

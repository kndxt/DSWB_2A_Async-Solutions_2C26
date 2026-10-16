import { apiFetch } from "./apiClient.js";
import { renderTable } from "./tabla.js";
import {
  limpiarMensajes,
  mostrarExito,
  mostrarError,
  configurarCierreMensajes,
} from "./mensajes.js";

const formVenta = document.querySelector("#form-venta");
const campoEventoId = document.querySelector("#eventoId");
const campoUsuarioId = document.querySelector("#usuarioId");
const botonVender = document.querySelector("#boton-vender");

const tabla = document.querySelector("#tabla-entradas");
const estado = document.querySelector("#estado");
const mensajeExito = document.querySelector("#mensaje-exito");
const mensajeError = document.querySelector("#mensaje-error");

let entradas = [];

const obtenerId = (referencia) => {
  if (referencia && typeof referencia === "object") {
    return referencia._id ?? referencia.id;
  }

  return referencia;
};

function renderizarNombreEId(celda, nombre, id) {
  const nombreElemento = document.createElement("strong");
  nombreElemento.textContent = nombre || "No disponible";

  const idElemento = document.createElement("small");
  idElemento.textContent = `ID: ${id ?? "No disponible"}`;

  celda.append(nombreElemento, idElemento);
}

const columnas = [
  {
    label: "Entrada",
    render: (celda, entrada) => {
      const numero = entradas.indexOf(entrada) + 1;

      renderizarNombreEId(
        celda,
        `Entrada ${numero}`,
        obtenerId(entrada)
      );
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

      renderizarNombreEId(
        celda,
        usuario
          ? `${usuario.nombre ?? ""} ${usuario.apellido ?? ""}`.trim()
          : "",
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

async function cargarEntradas() {
  estado.textContent = "Cargando entradas...";

  try {
    const resultado = await apiFetch("/entradas");

    if (!Array.isArray(resultado)) {
      throw new Error("La API devolvió un formato de entradas inesperado.");
    }

    entradas = resultado.reverse();
    renderTable(tabla, columnas, entradas);

    estado.textContent =
      entradas.length === 0
        ? "No hay entradas registradas."
        : `Entradas registradas: ${entradas.length}`;
  } catch (error) {
    estado.textContent = "No se pudieron cargar las entradas.";
    mostrarError(mensajeError, error.message);
  }
}

async function venderEntrada(event) {
  event.preventDefault();
  limpiarMensajes(mensajeExito, mensajeError);

  const eventoId = campoEventoId.value.trim();
  const usuarioId = campoUsuarioId.value.trim();

  botonVender.disabled = true;

  try {
    await apiFetch("/entradas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ eventoId, usuarioId }),
    });

    formVenta.reset();
    await cargarEntradas();

    mostrarExito(mensajeExito, "La entrada se vendió correctamente.");
  } catch (error) {
    mostrarError(mensajeError, error.message);
  } finally {
    botonVender.disabled = false;
  }
}

async function cancelarEntrada(id) {
  limpiarMensajes(mensajeExito, mensajeError);

  try {
    const entradaCancelada = await apiFetch(
      `/entradas/${id}/cancelar`,
      { method: "PATCH" }
    );

    entradas = entradas.map((entrada) =>
        String(obtenerId(entrada)) === String(id)
            ? { ...entrada, estado: entradaCancelada.estado }
            : entrada
        );

    renderTable(tabla, columnas, entradas);

    mostrarExito(mensajeExito, "La entrada se canceló correctamente.");
  } catch (error) {
    mostrarError(mensajeError, error.message);
  }
}

formVenta.addEventListener("submit", venderEntrada);

configurarCierreMensajes();
cargarEntradas();
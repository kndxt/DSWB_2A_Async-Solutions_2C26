import { apiFetch } from "../core/apiClient.js";
import { renderTable } from "../utils/tabla.js";
import { limpiarMensajes, mostrarMensaje } from "../core/mensajes.js";
import { formatearFechaHora } from "../utils/formato.js";
import { esAdmin } from "../core/rol.js";

// ========================================
// Elementos del DOM
// ========================================

const formVenta = document.querySelector("#form-venta");
const campoEventoId = document.querySelector("#eventoId");
const botonVender = document.querySelector("#boton-vender");

const tabla = document.querySelector("#tabla-entradas");
const estado = document.querySelector("#estado");

// ========================================
// Estado de la vista
// ========================================

let entradas = [];

// ========================================
// Comunicación con la API
// ========================================

const entradasApi = {
  listar: () => apiFetch("/entradas"),
  eventos: () => apiFetch("/eventos"),

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
  celda.append(nombreElemento);

  // El ID es un dato técnico: solo lo ve el administrador.
  if (esAdmin()) {
    const idElemento = document.createElement("small");
    idElemento.textContent = `ID: ${id ?? "No disponible"}`;
    celda.append(idElemento);
  }
}

// ========================================
// Configuración de la tabla
// ========================================

// Para el cliente, "vendida" se muestra como "comprada": es su punto de vista.
// El valor real que guarda la API no cambia.
const textoEstado = (estado) => (!esAdmin() && estado === "vendida" ? "comprada" : estado);

const columnas = [
  {
    label: "Entrada",
    render: (celda, entrada) => {
      const id = obtenerId(entrada);
      const indice = entradas.findIndex((item) => String(obtenerId(item)) === String(id));

      renderizarNombreEId(celda, `Entrada ${indice + 1}`, id);
    },
  },
  {
    label: "Evento",
    render: (celda, entrada) => {
      const evento = entrada.eventoId;

      renderizarNombreEId(celda, evento?.nombre, obtenerId(evento));
    },
  },
  {
    label: "Usuario",
    render: (celda, entrada) => {
      const usuario = entrada.usuarioId;

      const nombreCompleto = usuario
        ? `${usuario.nombre ?? ""} ${usuario.apellido ?? ""}`.trim()
        : "";

      renderizarNombreEId(celda, nombreCompleto, obtenerId(usuario));
    },
  },
  {
    label: "Estado",
    value: (entrada) => textoEstado(entrada.estado),
  },
  {
    label: esAdmin() ? "Fecha de venta" : "Fecha de compra",
    value: (entrada) =>
      entrada.fechaVenta ? new Date(entrada.fechaVenta).toLocaleString("es-AR") : "",
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

// La columna "Usuario" solo la ve el administrador: para un cliente todas las entradas son suyas.
const columnasVisibles = () =>
  columnas.filter((columna) => esAdmin() || columna.label !== "Usuario");

// ========================================
// Renderizado y carga de entradas
// ========================================

function renderizarEntradas() {
  renderTable(tabla, columnasVisibles(), entradas);

  const vacio = esAdmin() ? "No hay entradas registradas." : "Todavía no tenés entradas.";
  estado.textContent = entradas.length === 0 ? vacio : `Entradas registradas: ${entradas.length}`;
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
    mostrarMensaje("error", error.message);

    return false;
  }
}

function llenarSelect(select, textoInicial, items, etiqueta) {
  const inicial = document.createElement("option");
  inicial.value = "";
  inicial.textContent = textoInicial;

  const opciones = items.map((item) => {
    const opcion = document.createElement("option");
    opcion.value = item.id;
    opcion.textContent = etiqueta(item);
    return opcion;
  });

  select.replaceChildren(inicial, ...opciones);
}

async function cargarOpciones() {
  try {
    const eventos = await entradasApi.eventos();

    llenarSelect(
      campoEventoId,
      "Seleccioná un evento...",
      eventos.filter((evento) => evento.estado === "activo"),
      (evento) => `${evento.nombre} (${formatearFechaHora(evento.fechaInicio)})`,
    );
  } catch (error) {
    mostrarMensaje("error", `No se pudieron cargar los eventos: ${error.message}`);
  }
}

// ========================================
// Operaciones de entradas
// ========================================

async function venderEntrada(event) {
  event.preventDefault();
  limpiarMensajes();

  const eventoId = campoEventoId.value.trim();

  botonVender.disabled = true;

  try {
    await entradasApi.vender({ eventoId });

    formVenta.reset();

    const cargaCorrecta = await cargarEntradas();

    if (cargaCorrecta) {
      mostrarMensaje("exito", "La entrada se vendió correctamente.");
    }
  } catch (error) {
    mostrarMensaje("error", error.message);
  } finally {
    botonVender.disabled = false;
  }
}

async function cancelarEntrada(id) {
  const confirmar = window.confirm("¿Estás segura de que querés cancelar esta entrada?");

  if (!confirmar) {
    return;
  }

  limpiarMensajes();

  try {
    const entradaCancelada = await entradasApi.cancelar(id);

    entradas = entradas.map((entrada) =>
      String(obtenerId(entrada)) === String(id)
        ? { ...entrada, estado: entradaCancelada.estado }
        : entrada,
    );

    renderizarEntradas();
    mostrarMensaje("exito", "La entrada se canceló correctamente.");
  } catch (error) {
    mostrarMensaje("error", error.message);
  }
}

// ========================================
// Inicialización y eventos
// ========================================

formVenta.addEventListener("submit", venderEntrada);

cargarOpciones();
cargarEntradas();

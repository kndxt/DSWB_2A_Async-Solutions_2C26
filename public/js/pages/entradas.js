import { renderTable } from "../utils/tabla.js";
import { limpiarMensajes, mostrarMensaje } from "../core/mensajes.js";
import { formatearFechaHora } from "../utils/formato.js";
import { esAdmin } from "../core/rol.js";
import { entradasApi } from "../api/entradasApi.js";
import { eventosApi } from "../api/eventosApi.js";

// ========================================
// Elementos del DOM
// ========================================

const formCompra = document.querySelector("#form-compra");
const campoEventoId = document.querySelector("#eventoId");
const botonComprar = document.querySelector("#boton-comprar");

const tabla = document.querySelector("#tabla-entradas");
const estado = document.querySelector("#estado");

// ========================================
// Estado de la vista
// ========================================

let entradas = [];

// ========================================
// Utilidades
// ========================================

function obtenerId(referencia) {
  if (referencia && typeof referencia === "object") {
    return referencia._id ?? referencia.id;
  }

  return referencia;
}

function renderizarValor(celda, valor) {
  celda.textContent = valor || "No disponible";
}

// Un evento admite compras si está activo y estamos dentro de su período de venta.
// El backend vuelve a validarlo: acá solo se evita ofrecer opciones que van a fallar.
function admiteCompra(evento) {
  const ahora = Date.now();

  return (
    evento.estado === "activo" &&
    ahora >= new Date(evento.fechaInicioVenta).getTime() &&
    ahora <= new Date(evento.fechaFinVenta).getTime()
  );
}

// ========================================
// Configuración de la tabla
// ========================================

// Desde el punto de vista de quien la tiene, "vendida" es una entrada comprada.
// El valor real que guarda la API no cambia.
const textoEstado = (valor) => (valor === "vendida" ? "comprada" : valor);

const columnas = [
  {
    label: "Entrada",
    render: (celda, entrada) => {
      const id = obtenerId(entrada);
      const indice = entradas.findIndex((item) => String(obtenerId(item)) === String(id));

      renderizarValor(celda, `Entrada ${indice + 1}`);
    },
  },
  {
    label: "Evento",
    render: (celda, entrada) => {
      renderizarValor(celda, entrada.eventoId?.nombre);
    },
  },
  {
    label: "Usuario",
    render: (celda, entrada) => {
      const usuario = entrada.usuarioId;

      const nombreCompleto = usuario
        ? `${usuario.nombre ?? ""} ${usuario.apellido ?? ""}`.trim()
        : "";

      renderizarValor(celda, nombreCompleto);
    },
  },
  {
    label: "Estado",
    value: (entrada) => textoEstado(entrada.estado),
  },
  {
    label: "Fecha de compra",
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
      boton.className = "boton-peligro";
      boton.textContent = "Cancelar";

      boton.addEventListener("click", () => {
        cancelarEntrada(obtenerId(entrada));
      });

      celda.appendChild(boton);
    },
  },
];

// La columna "Usuario" solo tiene sentido para el administrador,
// que ve las entradas de todos. El cliente solo ve las suyas.
const columnasVisibles = () =>
  columnas.filter((columna) => columna.label !== "Usuario" || esAdmin());

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

async function cargarEventos() {
  try {
    const eventos = await eventosApi.listar();

    const inicial = document.createElement("option");
    inicial.value = "";
    inicial.textContent = "Seleccioná un evento...";

    const opciones = eventos.filter(admiteCompra).map((evento) => {
      const opcion = document.createElement("option");
      opcion.value = evento.id;
      opcion.textContent = `${evento.nombre} (${formatearFechaHora(evento.fechaInicio)})`;
      return opcion;
    });

    campoEventoId.replaceChildren(inicial, ...opciones);
  } catch (error) {
    mostrarMensaje("error", `No se pudieron cargar los eventos: ${error.message}`);
  }
}

// ========================================
// Operaciones de entradas
// ========================================

// La entrada siempre se registra a nombre de quien tiene la sesión iniciada:
// el backend toma la identidad de la sesión, por eso solo se envía el evento.
async function comprarEntrada(event) {
  event.preventDefault();
  limpiarMensajes();

  const eventoId = campoEventoId.value.trim();

  if (!eventoId) {
    mostrarMensaje("error", "Seleccioná el evento para el que querés comprar la entrada.");
    return;
  }

  botonComprar.disabled = true;

  try {
    await entradasApi.comprar({ eventoId });

    formCompra.reset();

    const cargaCorrecta = await cargarEntradas();

    if (cargaCorrecta) {
      mostrarMensaje("exito", "La entrada se compró correctamente.");
    }
  } catch (error) {
    mostrarMensaje("error", error.message);
  } finally {
    botonComprar.disabled = false;
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

if (formCompra) {
  formCompra.addEventListener("submit", comprarEntrada);
  cargarEventos();
}

cargarEntradas();

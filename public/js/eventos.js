// Vista de Eventos: listado, próximos, alta, edición y cancelación sobre la API /eventos.
// Módulo ES: usa apiFetch desde apiClient.js, igual que salas.js.
import { apiFetch } from "./apiClient.js";

// apiFetch pasa las options tal cual a fetch, así que armamos el JSON acá.
const enviarJson = (metodo, datos) => ({
  method: metodo,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(datos),
});

const eventosApi = {
  listar: () => apiFetch("/eventos"),
  proximos: () => apiFetch("/eventos/proximos"),
  obtener: (id) => apiFetch(`/eventos/${id}`),
  crear: (datos) => apiFetch("/eventos", enviarJson("POST", datos)),
  actualizar: (id, datos) => apiFetch(`/eventos/${id}`, enviarJson("PUT", datos)),
  salas: () => apiFetch("/salas"),
  usuarios: () => apiFetch("/usuarios"),   // ← nuevo
};

const CAMPOS_FECHA = ["fechaInicio", "fechaFin", "fechaInicioVenta", "fechaFinVenta"];

// Evento que se está editando (para no reenviar las fechas que no cambiaron).
let eventoEnEdicion = null;
// Salas por id, para mostrar la sala asociada (y si está inactiva) en las tablas.
let salasPorId = new Map();

// ---- Formato ----

const textoOGuion = (valor) =>
  valor === undefined || valor === null || valor === "" ? "—" : String(valor);

const formatearPrecio = (valor) =>
  `$ ${Number(valor).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatearFecha = (iso) => {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
};

const formatearRango = (desde, hasta) =>
  `${formatearFecha(desde)} - ${formatearFecha(hasta)}`;

const nombreDeSala = (salaId) => {
  const sala = salasPorId.get(salaId);
  if (!sala) return textoOGuion(salaId);
  return sala.estado === "inactiva" ? `${sala.nombre} (inactiva)` : sala.nombre;
};

// Convierte una fecha ISO al valor de un <input type="datetime-local"> (hora local).
const pad = (n) => String(n).padStart(2, "0");
const aInputLocal = (iso) => {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`;
};
const deInputLocal = (texto) => (texto === "" ? "" : new Date(texto).toISOString());

// ---- Mensajes ----

const mostrarMensaje = (tipo, texto) => {
  let contenedor = document.getElementById("mensajes");
  if (!contenedor) {
    contenedor = document.createElement("div");
    contenedor.id = "mensajes";
    const principal = document.querySelector("main");
    if (principal) principal.prepend(contenedor);
    else document.body.prepend(contenedor);
  }
  const esExito = tipo === "exito";
  const aviso = document.createElement("p");
  aviso.className = `mensaje ${esExito ? "mensaje-exito" : "mensaje-error"}`;
  aviso.setAttribute("role", esExito ? "status" : "alert");
  aviso.textContent = texto;
  contenedor.replaceChildren(aviso);
};

const limpiarMensajes = () => {
  const contenedor = document.getElementById("mensajes");
  if (contenedor) contenedor.replaceChildren();
};

// ---- Tablas ----

const crearCelda = (texto, clase) => {
  const celda = document.createElement("td");
  celda.textContent = texto;
  if (clase) celda.className = clase;
  return celda;
};

const crearEstado = (estado) => {
  const celda = document.createElement("td");
  celda.className = "celda-estado";
  const etiqueta = document.createElement("span");
  etiqueta.className = `estado estado-${estado}`;
  etiqueta.textContent = textoOGuion(estado);
  celda.append(etiqueta);
  return celda;
};

const crearBoton = (texto, accion, id) => {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.textContent = texto;
  boton.dataset.accion = accion;
  boton.dataset.id = id;
  return boton;
};

const filaMensaje = (texto, columnas) => {
  const fila = document.createElement("tr");
  const celda = crearCelda(texto);
  celda.colSpan = columnas;
  fila.append(celda);
  return fila;
};

const claseDeFila = (evento) =>
  evento.estado === "cancelado" || evento.estado === "finalizado"
    ? `evento-${evento.estado}`
    : "";

const crearFilaEvento = (evento) => {
  const fila = document.createElement("tr");
  if (claseDeFila(evento)) fila.className = claseDeFila(evento);

  const acciones = document.createElement("td");
  acciones.append(crearBoton("Editar", "editar", evento.id));
  // Solo se puede cancelar un evento activo; el registro y su reserva se conservan.
  if (evento.estado === "activo") {
    acciones.append(" ", crearBoton("Cancelar evento", "cancelar", evento.id));
  }
  acciones.dataset.nombre = evento.nombre;

  fila.append(
    crearCelda(evento.nombre),
    crearCelda(textoOGuion(evento.tipo)),
    crearCelda(nombreDeSala(evento.salaId)),
    crearCelda(formatearRango(evento.fechaInicio, evento.fechaFin)),
    crearCelda(formatearRango(evento.fechaInicioVenta, evento.fechaFinVenta)),
    crearCelda(formatearPrecio(evento.precioEntrada)),
    crearEstado(evento.estado),
    acciones,
  );
  return fila;
};

const crearFilaProximo = (evento) => {
  const fila = document.createElement("tr");
  if (claseDeFila(evento)) fila.className = claseDeFila(evento);
  fila.append(
    crearCelda(evento.nombre),
    crearCelda(nombreDeSala(evento.salaId)),
    crearCelda(formatearFecha(evento.fechaInicio)),
    crearCelda(formatearPrecio(evento.precioEntrada)),
    crearEstado(evento.estado),
  );
  return fila;
};

// ---- Carga de datos ----

const cargarSalas = async () => {
  try {
    const salas = await eventosApi.salas();
    salasPorId = new Map(
      (Array.isArray(salas) ? salas : []).map((sala) => [sala.id, sala]),
    );
  } catch (error) {
    // Sin nombres de sala se muestran los ids; los listados siguen funcionando.
    salasPorId = new Map();
    mostrarMensaje("error", `No se pudieron cargar las salas: ${error.message}`);
  }

  const select = document.getElementById("salaId");

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Seleccioná una sala...";

  select.replaceChildren(
    placeholder,
    ...[...salasPorId.values()]
      .filter((sala) => sala.estado !== "inactiva")
      .map((sala) => {
        const opcion = document.createElement("option");
        opcion.value = sala.id;
        opcion.textContent = `${sala.nombre} (${sala.capacidad} personas)`;
        return opcion;
      }),
  );
};
let usuariosPorId = new Map();

const cargarUsuarios = async () => {
  try {
    const usuarios = await eventosApi.usuarios();
    usuariosPorId = new Map(
      (Array.isArray(usuarios) ? usuarios : []).map((u) => [u.id, u]),
    );
  } catch (error) {
    usuariosPorId = new Map();
    mostrarMensaje("error", `No se pudieron cargar los usuarios: ${error.message}`);
  }

  const select = document.getElementById("usuarioId");
  if (!select) return;

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Seleccioná un usuario...";

  select.replaceChildren(
    placeholder,
    ...[...usuariosPorId.values()]
      .filter((u) => u.estado !== "inactivo")
      .map((u) => {
        const opcion = document.createElement("option");
        opcion.value = u.id;
        opcion.textContent = `${u.nombre} ${u.apellido} — ${u.email}`;
        return opcion;
      }),
  );
};
const cargarListado = async () => {
  const cuerpo = document.getElementById("eventos-body");
  try {
    const eventos = await eventosApi.listar();
    if (!Array.isArray(eventos) || eventos.length === 0) {
      cuerpo.replaceChildren(filaMensaje("No hay eventos registrados.", 8));
      return;
    }
    cuerpo.replaceChildren(...eventos.map(crearFilaEvento));
  } catch (error) {
    cuerpo.replaceChildren(filaMensaje("No se pudieron cargar los eventos.", 8));
    mostrarMensaje("error", error.message);
  }
};

const cargarProximos = async () => {
  const cuerpo = document.getElementById("proximos-body");
  try {
    const eventos = await eventosApi.proximos();
    if (!Array.isArray(eventos) || eventos.length === 0) {
      cuerpo.replaceChildren(filaMensaje("No hay eventos próximos.", 5));
      return;
    }
    cuerpo.replaceChildren(...eventos.map(crearFilaProximo));
  } catch (error) {
    cuerpo.replaceChildren(
      filaMensaje("No se pudieron cargar los eventos próximos.", 5),
    );
    mostrarMensaje("error", error.message);
  }
};

// Las salas se cargan primero para poder mostrar sus nombres en ambas tablas.
const cargarTodo = async () => {
  await Promise.all([cargarSalas(), cargarUsuarios()]);   // ← cargarUsuarios acá
  await Promise.all([cargarListado(), cargarProximos()]);
};

// ---- Formulario de alta y edición ----

const formulario = () => document.getElementById("form-evento");

const abrirFormulario = (titulo, esEdicion) => {
  document.getElementById("titulo-formulario").textContent = titulo;
  // El usuario solo se indica al crear; el estado solo se cambia al editar.
  document.getElementById("campo-usuario").hidden = esEdicion;
  document.getElementById("campo-estado").hidden = !esEdicion;
  document.getElementById("formulario-evento").hidden = false;
  formulario().elements.nombre.focus();
};

const cerrarFormulario = () => {
  formulario().reset();
  formulario().elements.id.value = "";
  eventoEnEdicion = null;
  document.getElementById("formulario-evento").hidden = true;
};

const abrirAlta = () => {
  limpiarMensajes();
  formulario().reset();
  formulario().elements.id.value = "";
  eventoEnEdicion = null;
  abrirFormulario("Nuevo evento", false);
};

const abrirEdicion = async (id) => {
  limpiarMensajes();
  try {
    const evento = await eventosApi.obtener(id);
    const campos = formulario().elements;
    eventoEnEdicion = evento;
    campos.id.value = evento.id;
    campos.nombre.value = evento.nombre ?? "";
    campos.tipo.value = evento.tipo ?? "";
    campos.descripcion.value = evento.descripcion ?? "";
    campos.precioEntrada.value = evento.precioEntrada ?? "";
    for (const campo of CAMPOS_FECHA) campos[campo].value = aInputLocal(evento[campo]);
    campos.salaId.value = evento.salaId ?? "";
    campos.estado.value = evento.estado ?? "activo";
    abrirFormulario("Editar evento", true);
  } catch (error) {
    mostrarMensaje("error", error.message);
  }
};

// Un campo numérico vacío se envía sin valor (alta) o como null (edición), para que
// sea el backend quien responda con su mensaje de dato obligatorio o inválido.
const leerNumero = (texto, valorVacio) =>
  texto.trim() === "" ? valorVacio : Number(texto);

const leerFormulario = (esEdicion) => {
  const campos = formulario().elements;
  const datos = {
    nombre: campos.nombre.value.trim(),
    tipo: campos.tipo.value.trim(),
    descripcion: campos.descripcion.value.trim(),
    precioEntrada: leerNumero(campos.precioEntrada.value, esEdicion ? null : undefined),
  };

  for (const campo of CAMPOS_FECHA) {
    const valor = campos[campo].value;
    // Si la fecha no cambió se conserva la guardada (el input no incluye segundos).
    if (esEdicion && valor === aInputLocal(eventoEnEdicion[campo])) continue;
    datos[campo] = deInputLocal(valor);
  }

  if (esEdicion) {
    datos.salaId = campos.salaId.value.trim();
    datos.estado = campos.estado.value;
  } else {
    // Vacío = ausente: el backend responde con su mensaje de id obligatorio.
    datos.salaId = campos.salaId.value.trim() || undefined;
    datos.usuarioId = campos.usuarioId.value.trim() || undefined;
  }
  return datos;
};

const guardarEvento = async (evento) => {
  evento.preventDefault();
  limpiarMensajes();

  const id = formulario().elements.id.value;
  const botonGuardar = document.getElementById("btn-guardar");
  botonGuardar.disabled = true;

  try {
    if (id) {
      await eventosApi.actualizar(id, leerFormulario(true));
      mostrarMensaje("exito", "Evento actualizado correctamente");
    } else {
      await eventosApi.crear(leerFormulario(false));
      mostrarMensaje("exito", "Evento creado correctamente");
    }
    cerrarFormulario();
    await cargarTodo();
  } catch (error) {
    // El formulario queda abierto con lo que escribió la persona.
    mostrarMensaje("error", error.message);
  } finally {
    botonGuardar.disabled = false;
  }
};

// ---- Cancelación ----

// Cancelar es un cambio de estado: no elimina el evento ni su reserva.
const cancelarEvento = async (id, nombre) => {
  limpiarMensajes();
  const confirmado = window.confirm(
    `¿Cancelar el evento "${nombre}"? El evento y su reserva se conservan, solo cambia su estado a cancelado.`,
  );
  if (!confirmado) return;

  try {
    await eventosApi.actualizar(id, { estado: "cancelado" });
    mostrarMensaje("exito", "Evento cancelado correctamente");
    await cargarTodo();
  } catch (error) {
    mostrarMensaje("error", error.message);
  }
};

// ---- Inicio ----

const iniciar = () => {
  document.getElementById("btn-nuevo-evento").addEventListener("click", abrirAlta);
  document.getElementById("btn-cancelar-formulario").addEventListener("click", () => {
    limpiarMensajes();
    cerrarFormulario();
  });
  formulario().addEventListener("submit", guardarEvento);

  document.getElementById("eventos-body").addEventListener("click", (evento) => {
    const boton = evento.target.closest("button[data-accion]");
    if (!boton) return;
    if (boton.dataset.accion === "editar") abrirEdicion(boton.dataset.id);
    if (boton.dataset.accion === "cancelar")
      cancelarEvento(boton.dataset.id, boton.parentElement.dataset.nombre);
  });

  cargarTodo();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciar);
} else {
  iniciar();
}
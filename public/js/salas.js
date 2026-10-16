// Vista de Salas: listado, detalle, alta y edición sobre la API /salas.
// Usa apiFetch (apiClient.js) para consumir la API y renderTable (tabla.js) para la tabla.
// Es un módulo ES: se carga con <script type="module"> y sus nombres no se mezclan con otros scripts.
import { apiFetch } from "./apiClient.js";
import { renderTable } from "./tabla.js";

// apiFetch pasa las opciones tal cual a fetch, así que el JSON se arma acá.
const enviarJson = (metodo, datos) => ({
  method: metodo,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(datos),
});

const salasApi = {
  listar: () => apiFetch("/salas"),
  obtener: (id) => apiFetch(`/salas/${id}`),
  crear: (datos) => apiFetch("/salas", enviarJson("POST", datos)),
  actualizar: (id, datos) => apiFetch(`/salas/${id}`, enviarJson("PUT", datos)),
};

const ESTADOS_SALA = ["activa", "inactiva"];

const formatearPrecio = (valor) =>
  `$ ${Number(valor).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const textoOGuion = (valor) => (valor === undefined || valor === null || valor === "" ? "—" : String(valor));

// Columnas de la tabla (formato que espera renderTable). "Acciones" se rellena después con botones.
const COLUMNAS = [
  { label: "Nombre", value: (sala) => sala.nombre },
  { label: "Capacidad", value: (sala) => sala.capacidad },
  { label: "Dirección", value: (sala) => sala.direccion },
  { label: "Precio de reserva", value: (sala) => formatearPrecio(sala.precioReserva) },
  { label: "Estado", value: (sala) => sala.estado },
  { label: "Acciones", value: () => "" },
];
const COL_ESTADO = COLUMNAS.findIndex((columna) => columna.label === "Estado");
const COL_ACCIONES = COLUMNAS.findIndex((columna) => columna.label === "Acciones");

// Sala que se está editando (para enviar el estado solo si cambió).
let salaEnEdicion = null;

const tabla = document.getElementById("tabla-salas");
const cuerpoTabla = tabla.querySelector("tbody");
const formulario = () => document.getElementById("form-sala");

// ---- Mensajes ----
// Mismo marcado que includes/mensajes.pug.

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

// ---- Listado ----

// Muestra un texto (cargando, vacío o error) ocupando todo el ancho de la tabla.
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

const crearBoton = (texto, accion, id) => {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.textContent = texto;
  boton.dataset.accion = accion;
  boton.dataset.id = id;
  return boton;
};

// renderTable solo escribe texto: acá se agregan la clase de fila, la etiqueta de estado y los botones.
const decorarFilas = (salas) => {
  salas.forEach((sala, i) => {
    const fila = cuerpoTabla.rows[i];
    if (sala.estado === "inactiva") fila.className = "sala-inactiva";

    const etiqueta = document.createElement("span");
    etiqueta.className = `estado ${ESTADOS_SALA.includes(sala.estado) ? `estado-${sala.estado}` : ""}`.trim();
    etiqueta.textContent = textoOGuion(sala.estado);
    fila.cells[COL_ESTADO].replaceChildren(etiqueta);

    fila.cells[COL_ACCIONES].append(crearBoton("Ver", "ver", sala.id), " ", crearBoton("Editar", "editar", sala.id));
  });
};

const cargarSalas = async () => {
  try {
    const salas = await salasApi.listar();
    if (!Array.isArray(salas) || salas.length === 0) {
      mostrarEnTabla("No hay salas registradas.");
      return;
    }
    renderTable(tabla, COLUMNAS, salas);
    decorarFilas(salas);
  } catch (error) {
    mostrarEnTabla("No se pudieron cargar las salas.");
    mostrarMensaje("error", error.message);
  }
};

// ---- Detalle ----

const cerrarDetalle = () => {
  document.getElementById("detalle-sala").hidden = true;
};

const agregarDato = (contenedor, etiqueta, valor) => {
  const parrafo = document.createElement("p");
  const negrita = document.createElement("strong");
  negrita.textContent = `${etiqueta}: `;
  parrafo.append(negrita, valor);
  contenedor.append(parrafo);
};

const mostrarDetalle = async (id) => {
  limpiarMensajes();
  try {
    const sala = await salasApi.obtener(id);
    const responsable = sala.responsable ?? {};
    const contenedor = document.getElementById("detalle-datos");
    contenedor.replaceChildren();
    agregarDato(contenedor, "Nombre", textoOGuion(sala.nombre));
    agregarDato(contenedor, "Capacidad", textoOGuion(sala.capacidad));
    agregarDato(contenedor, "Dirección", textoOGuion(sala.direccion));
    agregarDato(contenedor, "Precio de reserva", formatearPrecio(sala.precioReserva));
    agregarDato(contenedor, "Estado", textoOGuion(sala.estado));
    agregarDato(contenedor, "Responsable", `${textoOGuion(responsable.nombre)} ${responsable.apellido ?? ""}`.trim());
    agregarDato(contenedor, "Teléfono del responsable", textoOGuion(responsable.telefono));
    agregarDato(contenedor, "Email del responsable", textoOGuion(responsable.email));
    document.getElementById("detalle-sala").hidden = false;
  } catch (error) {
    mostrarMensaje("error", error.message);
  }
};

// ---- Formulario de alta y edición ----

const abrirFormulario = (titulo, esEdicion) => {
  document.getElementById("titulo-formulario").textContent = titulo;
  // El estado solo se cambia al editar: las salas nuevas se crean activas.
  document.getElementById("campo-estado").hidden = !esEdicion;
  document.getElementById("formulario-sala").hidden = false;
  formulario().elements.nombre.focus();
};

const cerrarFormulario = () => {
  formulario().reset();
  formulario().elements.id.value = "";
  salaEnEdicion = null;
  document.getElementById("formulario-sala").hidden = true;
};

const abrirAlta = () => {
  limpiarMensajes();
  cerrarDetalle();
  formulario().reset();
  formulario().elements.id.value = "";
  salaEnEdicion = null;
  abrirFormulario("Nueva sala", false);
};

const abrirEdicion = async (id) => {
  limpiarMensajes();
  cerrarDetalle();
  try {
    const sala = await salasApi.obtener(id);
    const campos = formulario().elements;
    const responsable = sala.responsable ?? {};
    salaEnEdicion = sala;
    campos.id.value = sala.id;
    campos.nombre.value = sala.nombre ?? "";
    campos.capacidad.value = sala.capacidad ?? "";
    campos.direccion.value = sala.direccion ?? "";
    campos.precioReserva.value = sala.precioReserva ?? "";
    campos.estado.value = sala.estado ?? "activa";
    campos.responsableNombre.value = responsable.nombre ?? "";
    campos.responsableApellido.value = responsable.apellido ?? "";
    campos.responsableTelefono.value = responsable.telefono ?? "";
    campos.responsableEmail.value = responsable.email ?? "";
    abrirFormulario("Editar sala", true);
  } catch (error) {
    mostrarMensaje("error", error.message);
  }
};

// Un campo numérico vacío se envía sin valor (alta) o como null (edición), para que
// sea el backend quien responda con su mensaje de dato obligatorio o inválido.
const leerNumero = (texto, valorVacio) => (texto.trim() === "" ? valorVacio : Number(texto));

const leerFormulario = (esEdicion) => {
  const campos = formulario().elements;
  const vacio = esEdicion ? null : undefined;
  const datos = {
    nombre: campos.nombre.value.trim(),
    capacidad: leerNumero(campos.capacidad.value, vacio),
    direccion: campos.direccion.value.trim(),
    precioReserva: leerNumero(campos.precioReserva.value, vacio),
    responsable: {
      nombre: campos.responsableNombre.value.trim(),
      apellido: campos.responsableApellido.value.trim(),
      telefono: campos.responsableTelefono.value.trim(),
      email: campos.responsableEmail.value.trim(),
    },
  };
  // El estado se envía solo si la persona lo cambió (la alta nunca lo envía).
  const estadoElegido = campos.estado.value;
  if (esEdicion && estadoElegido && estadoElegido !== salaEnEdicion.estado) {
    datos.estado = estadoElegido;
  }
  return datos;
};

const guardarSala = async (evento) => {
  evento.preventDefault();
  limpiarMensajes();

  const id = formulario().elements.id.value;
  const botonGuardar = document.getElementById("btn-guardar");
  botonGuardar.disabled = true;

  try {
    if (id) {
      await salasApi.actualizar(id, leerFormulario(true));
      mostrarMensaje("exito", "Sala actualizada correctamente");
    } else {
      await salasApi.crear(leerFormulario(false));
      mostrarMensaje("exito", "Sala creada correctamente");
    }
    cerrarFormulario();
    await cargarSalas();
  } catch (error) {
    // El formulario queda abierto con lo que escribió la persona.
    mostrarMensaje("error", error.message);
  } finally {
    botonGuardar.disabled = false;
  }
};

// ---- Inicio ----

const iniciar = () => {
  document.getElementById("btn-nueva-sala").addEventListener("click", abrirAlta);
  document.getElementById("btn-cerrar-detalle").addEventListener("click", cerrarDetalle);
  document.getElementById("btn-cancelar").addEventListener("click", () => {
    limpiarMensajes();
    cerrarFormulario();
  });
  formulario().addEventListener("submit", guardarSala);

  cuerpoTabla.addEventListener("click", (evento) => {
    const boton = evento.target.closest("button[data-accion]");
    if (!boton) return;
    if (boton.dataset.accion === "ver") mostrarDetalle(boton.dataset.id);
    if (boton.dataset.accion === "editar") abrirEdicion(boton.dataset.id);
  });

  mostrarEnTabla("Cargando salas...");
  cargarSalas();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciar);
} else {
  iniciar();
}
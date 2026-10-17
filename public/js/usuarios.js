// Vista de Usuarios: listado, detalle, alta, edición y cambio de estado sobre la API /usuarios.
// Módulo ES: usa apiFetch desde apiClient.js, igual que salas.js y eventos.js.
import { apiFetch } from "./apiClient.js";
import { renderTable } from "./tabla.js";

// apiFetch pasa las options tal cual a fetch, así que armamos el JSON acá.
const enviarJson = (metodo, datos) => ({
  method: metodo,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(datos),
});

const usuariosApi = {
  listar: () => apiFetch("/usuarios"),
  obtener: (id) => apiFetch(`/usuarios/${id}`),
  crear: (datos) => apiFetch("/usuarios", enviarJson("POST", datos)),
  actualizar: (id, datos) => apiFetch(`/usuarios/${id}`, enviarJson("PUT", datos)),
  cambiarEstado: (id, estado) =>
    apiFetch(`/usuarios/${id}/estado`, enviarJson("PATCH", { estado })),
};

const ESTADOS_USUARIO = ["activo", "inactivo"];

const textoOGuion = (valor) =>
  valor === undefined || valor === null || valor === "" ? "—" : String(valor);

// Columnas de la tabla (formato que espera renderTable). "Acciones" se rellena después.
const COLUMNAS = [
  { label: "Nombre", value: (u) => `${u.nombre ?? ""} ${u.apellido ?? ""}`.trim() },
  { label: "Email", value: (u) => u.email },
  { label: "Teléfono", value: (u) => textoOGuion(u.telefono) },
  { label: "Estado", value: (u) => u.estado },
  { label: "Acciones", value: () => "" },
];
const COL_ESTADO = COLUMNAS.findIndex((c) => c.label === "Estado");
const COL_ACCIONES = COLUMNAS.findIndex((c) => c.label === "Acciones");

// Usuario que se está editando (para saber si hubo cambios en el estado).
let usuarioEnEdicion = null;

const tabla = document.getElementById("tabla-usuarios");
const cuerpoTabla = tabla.querySelector("tbody");
const formulario = () => document.getElementById("form-usuario");

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

// ---- Listado ----

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
const decorarFilas = (usuarios) => {
  usuarios.forEach((usuario, i) => {
    const fila = cuerpoTabla.rows[i];
    if (usuario.estado === "inactivo") fila.className = "usuario-inactivo";

    const etiqueta = document.createElement("span");
    etiqueta.className = `estado ${ESTADOS_USUARIO.includes(usuario.estado) ? `estado-${usuario.estado}` : ""}`.trim();
    etiqueta.textContent = textoOGuion(usuario.estado);
    fila.cells[COL_ESTADO].replaceChildren(etiqueta);

    // Botón de estado: alterna entre activo e inactivo. No elimina nunca.
    const esActivo = usuario.estado === "activo";
    const botonEstado = crearBoton(esActivo ? "Desactivar" : "Activar", esActivo ? "desactivar" : "activar", usuario.id);
    botonEstado.dataset.nombre = `${usuario.nombre} ${usuario.apellido}`;

    fila.cells[COL_ACCIONES].append(
      crearBoton("Ver", "ver", usuario.id),
      " ",
      crearBoton("Editar", "editar", usuario.id),
      " ",
      botonEstado,
    );
  });
};

const cargarUsuarios = async () => {
  try {
    const usuarios = await usuariosApi.listar();
    if (!Array.isArray(usuarios) || usuarios.length === 0) {
      mostrarEnTabla("No hay usuarios registrados.");
      return;
    }
    renderTable(tabla, COLUMNAS, usuarios);
    decorarFilas(usuarios);
  } catch (error) {
    mostrarEnTabla("No se pudieron cargar los usuarios.");
    mostrarMensaje("error", error.message);
  }
};

// ---- Detalle ----

const cerrarDetalle = () => {
  document.getElementById("detalle-usuario").hidden = true;
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
    const usuario = await usuariosApi.obtener(id);
    const contenedor = document.getElementById("detalle-datos");
    contenedor.replaceChildren();
    agregarDato(contenedor, "Nombre", textoOGuion(usuario.nombre));
    agregarDato(contenedor, "Apellido", textoOGuion(usuario.apellido));
    agregarDato(contenedor, "Email", textoOGuion(usuario.email));
    agregarDato(contenedor, "Teléfono", textoOGuion(usuario.telefono));
    agregarDato(contenedor, "Estado", textoOGuion(usuario.estado));
    document.getElementById("detalle-usuario").hidden = false;
  } catch (error) {
    mostrarMensaje("error", error.message);
  }
};

// ---- Formulario de alta y edición ----

const abrirFormulario = (titulo) => {
  document.getElementById("titulo-formulario").textContent = titulo;
  document.getElementById("formulario-usuario").hidden = false;
  formulario().elements.nombre.focus();
};

const cerrarFormulario = () => {
  formulario().reset();
  formulario().elements.id.value = "";
  usuarioEnEdicion = null;
  document.getElementById("formulario-usuario").hidden = true;
};

const abrirAlta = () => {
  limpiarMensajes();
  cerrarDetalle();
  formulario().reset();
  formulario().elements.id.value = "";
  usuarioEnEdicion = null;
  abrirFormulario("Nuevo usuario");
};

const abrirEdicion = async (id) => {
  limpiarMensajes();
  cerrarDetalle();
  try {
    const usuario = await usuariosApi.obtener(id);
    const campos = formulario().elements;
    usuarioEnEdicion = usuario;
    campos.id.value = usuario.id;
    campos.nombre.value = usuario.nombre ?? "";
    campos.apellido.value = usuario.apellido ?? "";
    campos.email.value = usuario.email ?? "";
    campos.telefono.value = usuario.telefono ?? "";
    campos.password.value = ""; // la contraseña nunca se precarga
    abrirFormulario("Editar usuario");
  } catch (error) {
    mostrarMensaje("error", error.message);
  }
};

const leerFormulario = (esEdicion) => {
  const campos = formulario().elements;
  const datos = {
    nombre: campos.nombre.value.trim(),
    apellido: campos.apellido.value.trim(),
    email: campos.email.value.trim(),
    telefono: campos.telefono.value.trim(),
  };

  const password = campos.password.value;
  if (!esEdicion) {
    // En alta se envía siempre (aunque esté vacía) para que el backend responda con su mensaje.
    datos.password = password;
  } else if (password !== "") {
    // En edición solo se envía si la persona escribió algo, para no pisar la existente.
    datos.password = password;
  }

  return datos;
};

const guardarUsuario = async (evento) => {
  evento.preventDefault();
  limpiarMensajes();

  const id = formulario().elements.id.value;
  const botonGuardar = document.getElementById("btn-guardar");
  botonGuardar.disabled = true;

  try {
    if (id) {
      await usuariosApi.actualizar(id, leerFormulario(true));
      mostrarMensaje("exito", "Usuario actualizado correctamente");
    } else {
      await usuariosApi.crear(leerFormulario(false));
      mostrarMensaje("exito", "Usuario creado correctamente");
    }
    cerrarFormulario();
    await cargarUsuarios();
  } catch (error) {
    // El formulario queda abierto con lo que escribió la persona.
    mostrarMensaje("error", error.message);
  } finally {
    botonGuardar.disabled = false;
  }
};

// ---- Cambio de estado ----

// Alternar el estado no elimina al usuario: solo pasa entre activo e inactivo.
const cambiarEstado = async (id, nombre, nuevoEstado) => {
  limpiarMensajes();
  const verbo = nuevoEstado === "activo" ? "activar" : "desactivar";
  const confirmado = window.confirm(
    `¿Seguro que querés ${verbo} a "${nombre}"? El usuario se conserva en el sistema, solo cambia su estado.`,
  );
  if (!confirmado) return;

  try {
    await usuariosApi.cambiarEstado(id, nuevoEstado);
    mostrarMensaje("exito", `Usuario ${nuevoEstado === "activo" ? "activado" : "desactivado"} correctamente`);
    await cargarUsuarios();
  } catch (error) {
    mostrarMensaje("error", error.message);
  }
};

// ---- Inicio ----

const iniciar = () => {
  document.getElementById("btn-nuevo-usuario").addEventListener("click", abrirAlta);
  document.getElementById("btn-cerrar-detalle").addEventListener("click", cerrarDetalle);
  document.getElementById("btn-cancelar").addEventListener("click", () => {
    limpiarMensajes();
    cerrarFormulario();
  });
  formulario().addEventListener("submit", guardarUsuario);

  cuerpoTabla.addEventListener("click", (evento) => {
    const boton = evento.target.closest("button[data-accion]");
    if (!boton) return;
    const { accion, id } = boton.dataset;
    if (accion === "ver") mostrarDetalle(id);
    if (accion === "editar") abrirEdicion(id);
    if (accion === "activar") cambiarEstado(id, boton.dataset.nombre, "activo");
    if (accion === "desactivar") cambiarEstado(id, boton.dataset.nombre, "inactivo");
  });

  mostrarEnTabla("Cargando usuarios...");
  cargarUsuarios();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciar);
} else {
  iniciar();
}

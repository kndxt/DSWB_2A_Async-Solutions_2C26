import { renderTable, mostrarMensajeEnTabla } from "../utils/tabla.js";
import { crearBoton, agregarDato, alCargarDOM } from "../utils/dom.js";
import { textoOGuion } from "../utils/formato.js";
import { mostrarMensaje, limpiarMensajes } from "../core/mensajes.js";
import { usuariosApi } from "../api/usuariosApi.js";

const ESTADOS_USUARIO = ["activo", "inactivo"];

// Columnas de la tabla (formato que espera renderTable). "Acciones" se rellena después.
const COLUMNAS = [
  { label: "Nombre", value: (u) => `${u.nombre ?? ""} ${u.apellido ?? ""}`.trim() },
  { label: "Email", value: (u) => u.email },
  { label: "Teléfono", value: (u) => textoOGuion(u.telefono) },
  { label: "Estado", value: (u) => u.estado },
  { label: "Rol", value: (u) => u.rol },
  { label: "Acciones", value: () => "" },
];
const COL_ESTADO = COLUMNAS.findIndex((c) => c.label === "Estado");
const COL_ROL = COLUMNAS.findIndex((c) => c.label === "Rol");
const COL_ACCIONES = COLUMNAS.findIndex((c) => c.label === "Acciones");

// Usuario que se está editando (para saber si hubo cambios en el estado).
let usuarioEnEdicion = null;

const tabla = document.getElementById("tabla-usuarios");
const cuerpoTabla = tabla.querySelector("tbody");
const formulario = () => document.getElementById("form-usuario");

// Muestra un texto (cargando, vacío o error) ocupando todo el ancho de la tabla.
const mostrarEnTabla = (texto) => mostrarMensajeEnTabla(tabla, COLUMNAS, texto);

// renderTable solo escribe texto: acá se agregan la clase de fila, la etiqueta de estado, la de rol y los botones.
const decorarFilas = (usuarios) => {
  usuarios.forEach((usuario, i) => {
    const fila = cuerpoTabla.rows[i];
    if (usuario.estado === "inactivo") fila.className = "usuario-inactivo";

    const etiquetaEstado = document.createElement("span");
    etiquetaEstado.className =
      `estado ${ESTADOS_USUARIO.includes(usuario.estado) ? `estado-${usuario.estado}` : ""}`.trim();
    etiquetaEstado.textContent = textoOGuion(usuario.estado);
    fila.cells[COL_ESTADO].replaceChildren(etiquetaEstado);

    const etiquetaRol = document.createElement("span");
    etiquetaRol.className = `rol rol-${usuario.rol || "cliente"}`;
    etiquetaRol.textContent = textoOGuion(usuario.rol);
    fila.cells[COL_ROL].replaceChildren(etiquetaRol);

    // Botón de estado: alterna entre activo e inactivo. No elimina nunca.
    const esActivo = usuario.estado === "activo";
    const botonEstado = crearBoton(
      esActivo ? "Desactivar" : "Activar",
      esActivo ? "desactivar" : "activar",
      usuario.id,
    );
    botonEstado.dataset.nombre = `${usuario.nombre} ${usuario.apellido}`;

    // Botón de rol: alterna entre admin y cliente.
    const esAdmin = usuario.rol === "admin";
    const botonRol = crearBoton(
      esAdmin ? "Hacer cliente" : "Hacer admin",
      esAdmin ? "hacer-cliente" : "hacer-admin",
      usuario.id,
    );
    botonRol.dataset.nombre = `${usuario.nombre} ${usuario.apellido}`;

    fila.cells[COL_ACCIONES].append(
      crearBoton("Ver", "ver", usuario.id),
      " ",
      crearBoton("Editar", "editar", usuario.id),
      " ",
      botonEstado,
      " ",
      botonRol,
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
    agregarDato(contenedor, "Rol", textoOGuion(usuario.rol));
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
    mostrarMensaje(
      "exito",
      `Usuario ${nuevoEstado === "activo" ? "activado" : "desactivado"} correctamente`,
    );
    await cargarUsuarios();
  } catch (error) {
    mostrarMensaje("error", error.message);
  }
};

// ---- Cambio de rol ----

const cambiarRol = async (id, nombre, nuevoRol) => {
  limpiarMensajes();
  const confirmado = window.confirm(
    `¿Seguro que querés cambiar el rol de "${nombre}" a ${nuevoRol}?`,
  );
  if (!confirmado) return;

  try {
    await usuariosApi.cambiarRol(id, nuevoRol);
    mostrarMensaje("exito", `Rol actualizado a ${nuevoRol} correctamente`);
    await cargarUsuarios();
  } catch (error) {
    mostrarMensaje("error", error.message);
  }
};

// ---- Inicio ----

const iniciar = () => {
  const botonNuevo = document.getElementById("btn-nuevo-usuario");
  if (botonNuevo) botonNuevo.addEventListener("click", abrirAlta);

  document.getElementById("btn-cerrar-detalle").addEventListener("click", cerrarDetalle);

  const botonCancelar = document.getElementById("btn-cancelar");
  if (botonCancelar) {
    botonCancelar.addEventListener("click", () => {
      limpiarMensajes();
      cerrarFormulario();
    });
  }

  if (formulario()) formulario().addEventListener("submit", guardarUsuario);

  cuerpoTabla.addEventListener("click", (evento) => {
    const boton = evento.target.closest("button[data-accion]");
    if (!boton) return;
    const { accion, id } = boton.dataset;
    if (accion === "ver") mostrarDetalle(id);
    if (accion === "editar") abrirEdicion(id);
    if (accion === "activar") cambiarEstado(id, boton.dataset.nombre, "activo");
    if (accion === "desactivar") cambiarEstado(id, boton.dataset.nombre, "inactivo");
    if (accion === "hacer-admin") cambiarRol(id, boton.dataset.nombre, "admin");
    if (accion === "hacer-cliente") cambiarRol(id, boton.dataset.nombre, "cliente");
  });

  mostrarMensajeEnTabla("Cargando usuarios...");
  cargarUsuarios();
};

mostrarEnTabla("Cargando usuarios...");
cargarUsuarios();

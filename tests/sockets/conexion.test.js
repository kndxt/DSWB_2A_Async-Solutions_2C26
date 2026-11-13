import test, { before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import Usuario from "../../models/usuarioModel.js";
import { ESTADOS_USUARIO } from "../../definitions/usuario.js";
import {
  iniciarEntorno,
  cerrarEntorno,
  conectarCliente,
  cerrarClientes,
  esperarEvento,
  esperarHasta,
  crearUsuario,
  crearSesion,
} from "../helpers/environment.js";
import { obtenerIO } from "../../sockets/index.js";
import { EVENTOS, LIMITE_TEXTO, TIPOS } from "../../sockets/eventos.js";

before(() => iniciarEntorno({ sockets: true }));
after(cerrarEntorno);

// Cantidad de conexiones que el servidor tiene abiertas en este momento.
const conexionesActivas = () => obtenerIO().sockets.sockets.size;

// Desde F10.2 el handshake exige sesión: cada prueba conecta con la cookie
// de un usuario real. Un mismo usuario puede abrir varias conexiones.
const opcionesConSesion = async () => ({
  extraHeaders: crearSesion(await crearUsuario()),
});

// Cada prueba parte sin conexiones abiertas, para que los conteos sean exactos.
afterEach(async () => {
  cerrarClientes();
  await esperarHasta(() => conexionesActivas() === 0);
});

// CONEXIONES

test("un cliente autenticado puede conectarse y recibe un identificador", async () => {
  const cliente = await conectarCliente(await opcionesConSesion());

  assert.equal(cliente.connected, true);
  assert.equal(typeof cliente.id, "string");

  await esperarHasta(() => conexionesActivas() === 1);
});

test("varios clientes pueden conectarse simultáneamente", async () => {
  const opciones = await opcionesConSesion();
  const clientes = await Promise.all([
    conectarCliente(opciones),
    conectarCliente(opciones),
    conectarCliente(opciones),
  ]);

  const identificadores = new Set(clientes.map((cliente) => cliente.id));
  assert.equal(identificadores.size, 3);

  await esperarHasta(() => conexionesActivas() === 3);
});

test("el servidor detecta la desconexión de un cliente", async () => {
  const opciones = await opcionesConSesion();
  const [primero, segundo] = await Promise.all([
    conectarCliente(opciones),
    conectarCliente(opciones),
  ]);
  await esperarHasta(() => conexionesActivas() === 2);

  primero.disconnect();

  await esperarHasta(() => conexionesActivas() === 1);
  assert.equal(segundo.connected, true);
});

// MENSAJES DE SISTEMA

test("la primera conexión de un usuario anuncia su entrada", async () => {
  const observador = await conectarCliente(await opcionesConSesion());
  const usuario = await crearUsuario();

  // El observador ya está conectado antes de que ingrese el usuario.
  const entrada = esperarEvento(observador, EVENTOS.MENSAJE);

  await conectarCliente({
    extraHeaders: crearSesion(usuario),
  });

  const mensaje = await entrada;

  assert.equal(mensaje.tipo, TIPOS.SISTEMA);
  assert.equal(mensaje.autor, null);
  assert.equal(
    mensaje.texto,
    `${usuario.nombre} ${usuario.apellido}`.trim() + " se conectó al chat.",
  );
  assert.equal(Number.isNaN(Date.parse(mensaje.fecha)), false);
});

test("una segunda pestaña del mismo usuario no anuncia otra entrada", async () => {
  const usuario = await crearUsuario();
  const opciones = { extraHeaders: crearSesion(usuario) };

  const primero = await conectarCliente(opciones);

  let anunciosEntrada = 0;
  primero.on(EVENTOS.MENSAJE, (mensaje) => {
    if (mensaje.tipo === TIPOS.SISTEMA && mensaje.texto.endsWith("se conectó al chat.")) {
      anunciosEntrada += 1;
    }
  });

  await conectarCliente(opciones);
  await esperarHasta(() => conexionesActivas() === 2);
  await new Promise((resolve) => setTimeout(resolve, 100));

  assert.equal(anunciosEntrada, 0);
});

test("desconectar una pestaña no anuncia la salida si queda otra abierta", async () => {
  const observador = await conectarCliente(await opcionesConSesion());
  const usuario = await crearUsuario();
  const opciones = { extraHeaders: crearSesion(usuario) };

  // La primera pestaña genera el único anuncio de entrada.
  const entrada = esperarEvento(observador, EVENTOS.MENSAJE);
  const primero = await conectarCliente(opciones);
  await entrada;

  // La segunda pestaña no debe generar otro anuncio.
  const segundo = await conectarCliente(opciones);
  await esperarHasta(() => conexionesActivas() === 3);

  let anunciosSalida = 0;
  observador.on(EVENTOS.MENSAJE, (mensaje) => {
    if (mensaje.tipo === TIPOS.SISTEMA && mensaje.texto.endsWith("se desconectó del chat.")) {
      anunciosSalida += 1;
    }
  });

  primero.disconnect();

  await esperarHasta(() => conexionesActivas() === 2);
  await new Promise((resolve) => setTimeout(resolve, 100));

  assert.equal(anunciosSalida, 0);
  assert.equal(segundo.connected, true);
});

test("desconectar la última pestaña anuncia la salida del usuario", async () => {
  const observador = await conectarCliente(await opcionesConSesion());
  const usuario = await crearUsuario();

  const entrada = esperarEvento(observador, EVENTOS.MENSAJE);
  const cliente = await conectarCliente({
    extraHeaders: crearSesion(usuario),
  });
  await entrada;

  // Se prepara la escucha antes de desconectar al usuario.
  const salida = esperarEvento(observador, EVENTOS.MENSAJE);
  cliente.disconnect();

  const mensaje = await salida;

  assert.equal(mensaje.tipo, TIPOS.SISTEMA);
  assert.equal(mensaje.autor, null);
  assert.equal(
    mensaje.texto,
    `${usuario.nombre} ${usuario.apellido}`.trim() + " se desconectó del chat.",
  );
});

// MENSAJES DEL CHAT

test("un mensaje válido se difunde a todos los clientes conectados", async () => {
  const usuario = await crearUsuario();
  const opciones = { extraHeaders: crearSesion(usuario) };

  const clientes = await Promise.all([
    conectarCliente(opciones),
    conectarCliente(opciones),
    conectarCliente(opciones),
  ]);

  const recepciones = clientes.map((cliente) => esperarEvento(cliente, EVENTOS.MENSAJE));

  clientes[0].emit(EVENTOS.MENSAJE, { texto: "Hola a todos" });

  const mensajes = await Promise.all(recepciones);
  const mensaje = mensajes[0];

  for (const recibido of mensajes) {
    assert.deepEqual(recibido, mensaje);
  }

  assert.equal(mensaje.tipo, TIPOS.USUARIO);
  assert.deepEqual(mensaje.autor, {
    id: usuario.id,
    nombre: `${usuario.nombre} ${usuario.apellido}`.trim(),
  });
  assert.equal(mensaje.texto, "Hola a todos");
  assert.match(mensaje.id, /^[0-9a-f-]{36}$/i);
  assert.equal(Number.isNaN(Date.parse(mensaje.fecha)), false);
});

test("el servidor ignora la identidad enviada por el cliente", async () => {
  const usuario = await crearUsuario();
  const cliente = await conectarCliente({
    extraHeaders: crearSesion(usuario),
  });

  const recepcion = esperarEvento(cliente, EVENTOS.MENSAJE);

  cliente.emit(EVENTOS.MENSAJE, {
    texto: "Hola",
    usuarioId: "usuario-falso",
    nombre: "Identidad falsa",
    rol: "admin",
  });

  const mensaje = await recepcion;

  assert.deepEqual(mensaje.autor, {
    id: usuario.id,
    nombre: `${usuario.nombre} ${usuario.apellido}`.trim(),
  });
});

test("un mensaje vacío es rechazado y el error solo llega al emisor", async () => {
  const opciones = await opcionesConSesion();
  const [emisor, otro] = await Promise.all([conectarCliente(opciones), conectarCliente(opciones)]);

  let erroresDelOtro = 0;
  otro.on(EVENTOS.ERROR, () => {
    erroresDelOtro += 1;
  });

  const error = esperarEvento(emisor, EVENTOS.ERROR);
  emisor.emit(EVENTOS.MENSAJE, { texto: "   " });

  assert.deepEqual(await error, {
    mensaje: "El mensaje no puede estar vacío.",
  });

  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(erroresDelOtro, 0);
  assert.equal(emisor.connected, true);
  assert.equal(otro.connected, true);
});

test("un payload con formato inválido es rechazado", async () => {
  const cliente = await conectarCliente(await opcionesConSesion());

  const error = esperarEvento(cliente, EVENTOS.ERROR);
  cliente.emit(EVENTOS.MENSAJE, { texto: 123 });

  assert.deepEqual(await error, {
    mensaje: "El mensaje no tiene un formato válido.",
  });

  assert.equal(cliente.connected, true);
});

test("un mensaje que supera el límite de caracteres es rechazado", async () => {
  const cliente = await conectarCliente(await opcionesConSesion());

  const error = esperarEvento(cliente, EVENTOS.ERROR);
  cliente.emit(EVENTOS.MENSAJE, {
    texto: "a".repeat(LIMITE_TEXTO + 1),
  });

  assert.deepEqual(await error, {
    mensaje: `El mensaje no puede superar los ${LIMITE_TEXTO} caracteres.`,
  });

  assert.equal(cliente.connected, true);
});

test("un mensaje que alcanza el límite de caracteres es aceptado", async () => {
  const cliente = await conectarCliente(await opcionesConSesion());
  const texto = "a".repeat(LIMITE_TEXTO);

  const recepcion = esperarEvento(cliente, EVENTOS.MENSAJE);

  cliente.emit(EVENTOS.MENSAJE, { texto });

  const mensaje = await recepcion;

  assert.equal(mensaje.texto, texto);
  assert.equal(mensaje.texto.length, LIMITE_TEXTO);
  assert.equal(mensaje.tipo, TIPOS.USUARIO);
});

test("el servidor elimina los espacios al principio y al final del mensaje", async () => {
  const cliente = await conectarCliente(await opcionesConSesion());

  const recepcion = esperarEvento(cliente, EVENTOS.MENSAJE);

  cliente.emit(EVENTOS.MENSAJE, {
    texto: "   Hola a todos   ",
  });

  const mensaje = await recepcion;

  assert.equal(mensaje.texto, "Hola a todos");
});

// REVALIDACIÓN DE SESIÓN

test("un mensaje con la sesión vencida provoca la desconexión y no se difunde", async () => {
  const observador = await conectarCliente(await opcionesConSesion());
  const usuario = await crearUsuario();

  const cliente = await conectarCliente({
    extraHeaders: crearSesion(usuario),
  });

  // Obtenemos el socket del servidor para simular el vencimiento de la sesión.
  const socketServidor = obtenerIO().sockets.sockets.get(cliente.id);

  socketServidor.data.expiraEn = Date.now() - 1;

  // Escuchamos antes de emitir para no perder el evento.
  const sesionExpirada = esperarEvento(cliente, EVENTOS.SESION_EXPIRADA);

  let mensajesDifundidos = 0;
  observador.on(EVENTOS.MENSAJE, (mensaje) => {
    if (mensaje.tipo === TIPOS.USUARIO) {
      mensajesDifundidos += 1;
    }
  });

  cliente.emit(EVENTOS.MENSAJE, {
    texto: "Este mensaje no debería llegar al chat.",
  });

  await sesionExpirada;
  await esperarHasta(() => !cliente.connected);

  assert.equal(cliente.connected, false);
  assert.equal(mensajesDifundidos, 0);
});

test("un usuario desactivado no puede enviar mensajes y es desconectado", async () => {
  const observador = await conectarCliente(await opcionesConSesion());
  const usuario = await crearUsuario();

  // El usuario se conecta mientras todavía está activo.
  const cliente = await conectarCliente({
    extraHeaders: crearSesion(usuario),
  });

  // Se desactiva en la base de datos sin cerrar su sesión previamente.
  await Usuario.actualizar(usuario.id, {
    estado: ESTADOS_USUARIO.INACTIVO,
  });

  const sesionExpirada = esperarEvento(cliente, EVENTOS.SESION_EXPIRADA);

  let mensajesDeUsuario = 0;

  observador.on(EVENTOS.MENSAJE, (mensaje) => {
    if (mensaje.tipo === TIPOS.USUARIO) {
      mensajesDeUsuario += 1;
    }
  });

  cliente.emit(EVENTOS.MENSAJE, {
    texto: "Este mensaje tampoco debería llegar al chat.",
  });

  await sesionExpirada;
  await esperarHasta(() => !cliente.connected);

  assert.equal(cliente.connected, false);
  assert.equal(mensajesDeUsuario, 0);
});

test("un error de base de datos durante la revalidación no desconecta al usuario", async (t) => {
  const observador = await conectarCliente(await opcionesConSesion());
  const usuario = await crearUsuario();

  const cliente = await conectarCliente({
    extraHeaders: crearSesion(usuario),
  });

  const errorBD = new Error("Fallo simulado de MongoDB");

  // Simula un fallo al consultar nuevamente el usuario durante la revalidación.
  t.mock.method(Usuario, "obtenerPorId", async () => {
    throw errorBD;
  });

  // Evita imprimir el error esperado durante la prueba.
  const registrarError = t.mock.method(console, "error", () => {});

  const respuestaError = esperarEvento(cliente, EVENTOS.ERROR);

  let mensajesDeUsuario = 0;

  observador.on(EVENTOS.MENSAJE, (mensaje) => {
    if (mensaje.tipo === TIPOS.USUARIO) {
      mensajesDeUsuario += 1;
    }
  });

  cliente.emit(EVENTOS.MENSAJE, {
    texto: "Este mensaje no debería llegar al chat.",
  });

  const respuesta = await respuestaError;

  assert.equal(respuesta.mensaje, "Ocurrió un error interno. Intentá nuevamente más tarde.");
  assert.equal(cliente.connected, true);
  assert.equal(mensajesDeUsuario, 0);
  assert.equal(registrarError.mock.calls.length, 1);
});

// EMISIONES DEL SERVIDOR

test("el servidor puede emitir un evento a todos los clientes", async () => {
  const opciones = await opcionesConSesion();
  const clientes = await Promise.all([conectarCliente(opciones), conectarCliente(opciones)]);

  const recepciones = clientes.map((cliente) => esperarEvento(cliente, "prueba:servidor"));
  obtenerIO().emit("prueba:servidor", { numero: 1 });

  const resultados = await Promise.all(recepciones);

  for (const datos of resultados) {
    assert.deepEqual(datos, { numero: 1 });
  }
});

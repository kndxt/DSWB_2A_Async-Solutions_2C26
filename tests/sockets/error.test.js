import test, { before, after, afterEach } from "node:test";
import assert from "node:assert/strict";

import {
  iniciarEntorno,
  cerrarEntorno,
  conectarCliente,
  cerrarClientes,
  esperarEvento,
  esperarHasta,
  crearUsuario,
  crearSesion,
  Usuario,
} from "../helpers/environment.js";
import { obtenerIO } from "../../sockets/index.js";
import { revalidarSocket } from "../../sockets/authSocket.js";
import asyncHandlerSocket from "../../sockets/asyncHandlerSocket.js";
import { EVENTOS } from "../../sockets/eventos.js";

before(() => iniciarEntorno({ sockets: true }));
after(cerrarEntorno);

const conexionesActivas = () => obtenerIO().sockets.sockets.size;

const EVENTO_PRUEBA = "prueba:revalidacion";

// Registra un evento temporal que ejecuta la revalidación
// mediante el wrapper de errores.
const conectarConEventoPrueba = async (usuario) => {
  let socketServidor;

  obtenerIO().once("connection", (socket) => {
    socketServidor = socket;

    socket.on(
      EVENTO_PRUEBA,
      asyncHandlerSocket(socket, async () => {
        await revalidarSocket(socket);
      }),
    );
  });

  const cliente = await conectarCliente({
    extraHeaders: crearSesion(usuario),
  });

  await esperarHasta(() => socketServidor !== undefined);

  return { cliente, socketServidor };
};

// Cada prueba parte sin conexiones abiertas.
afterEach(async () => {
  cerrarClientes();
  await esperarHasta(() => conexionesActivas() === 0);
});

// ============================================================
// SESIONES INVÁLIDAS
// ============================================================

test("el wrapper emite chat:sesion-expirada y desconecta cuando el token venció", async () => {
  const usuario = await crearUsuario();
  const { cliente, socketServidor } = await conectarConEventoPrueba(usuario);

  // Forzamos el vencimiento sin esperar una hora.
  socketServidor.data.expiraEn = Date.now() - 1;

  const esperandoExpiracion = esperarEvento(cliente, EVENTOS.SESION_EXPIRADA);

  cliente.emit(EVENTO_PRUEBA);

  await esperandoExpiracion;
  await esperarHasta(() => cliente.disconnected === true);

  assert.equal(socketServidor.connected, false);
});

test("el wrapper emite chat:sesion-expirada y desconecta cuando el usuario fue desactivado", async () => {
  const usuario = await crearUsuario();
  const { cliente, socketServidor } = await conectarConEventoPrueba(usuario);

  await Usuario.actualizar(usuario.id, { estado: "inactivo" });

  const esperandoExpiracion = esperarEvento(cliente, EVENTOS.SESION_EXPIRADA);

  cliente.emit(EVENTO_PRUEBA);

  await esperandoExpiracion;
  await esperarHasta(() => cliente.disconnected === true);

  assert.equal(socketServidor.connected, false);
});

// ============================================================
// ERRORES INTERNOS
// ============================================================

test("el wrapper emite un error genérico sin desconectar cuando falla MongoDB", async (t) => {
  const usuario = await crearUsuario();
  const { cliente, socketServidor } = await conectarConEventoPrueba(usuario);

  const errorBD = new Error("Error de conexión con MongoDB");

  t.mock.method(Usuario, "obtenerPorId", async () => {
    throw errorBD;
  });

  const registrarError = t.mock.method(console, "error", () => {});

  const esperandoError = esperarEvento(cliente, EVENTOS.ERROR);

  cliente.emit(EVENTO_PRUEBA);

  const respuesta = await esperandoError;

  assert.deepEqual(respuesta, {
    mensaje: "Ocurrió un error interno. Intentá nuevamente más tarde.",
  });

  assert.equal(registrarError.mock.callCount(), 1);
  assert.equal(cliente.connected, true);
  assert.equal(socketServidor.connected, true);
});

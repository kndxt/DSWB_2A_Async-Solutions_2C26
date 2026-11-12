import test, { before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import {
  iniciarEntorno,
  cerrarEntorno,
  conectarCliente,
  cerrarClientes,
  crearUsuario,
  crearSesion,
  esperarEvento,
  esperarHasta,
  Usuario,
} from "../helpers/environment.js";
import { obtenerIO } from "../../sockets/index.js";
import { revalidarSocket } from "../../sockets/authSocket.js";
import { EVENTOS } from "../../sockets/eventos.js";

before(() => iniciarEntorno({ sockets: true }));
after(cerrarEntorno);

const conexionesActivas = () => obtenerIO().sockets.sockets.size;

const socketServidorUnico = async () => {
  await esperarHasta(() => conexionesActivas() === 1);
  return [...obtenerIO().sockets.sockets.values()][0];
};

afterEach(async () => {
  cerrarClientes();
  await esperarHasta(() => conexionesActivas() === 0);
});

// ============================================================
// CONEXIONES ACEPTADAS
// ============================================================

test("un cliente con token válido se conecta y el servidor guarda su identidad", async () => {
  const usuario = await crearUsuario();
  const sesion = crearSesion(usuario);          
  const cliente = await conectarCliente({ extraHeaders: sesion });

  assert.equal(cliente.connected, true);

  const socketServidor = await socketServidorUnico();

  assert.equal(socketServidor.data.usuario.id, usuario.id);
  assert.equal(socketServidor.data.usuario.rol, usuario.rol);
  assert.match(socketServidor.data.usuario.nombre, new RegExp(usuario.nombre));
  assert.ok(typeof socketServidor.data.expiraEn === "number");
  assert.ok(socketServidor.data.expiraEn > Date.now());
  assert.equal(
    socketServidor.data.token,
    sesion.Cookie.slice("token=".length),         
  );
});
// ============================================================
// CONEXIONES RECHAZADAS
// ============================================================

test("rechaza conexiones sin cookie", async () => {
  await assert.rejects(conectarCliente(), /No autorizado/);
});

test("rechaza conexiones con token malformado", async () => {
  await assert.rejects(
    conectarCliente({ extraHeaders: { Cookie: "token=esto-no-es-un-jwt" } }),
    /No autorizado/,
  );
});

test("rechaza conexiones con token expirado", async () => {
  const token = jwt.sign(
    { id: "000000000000000000000001", rol: "cliente" },
    process.env.JWT_SECRET,
    { expiresIn: "-1s" },
  );

  await assert.rejects(
    conectarCliente({ extraHeaders: { Cookie: `token=${token}` } }),
    /No autorizado/,
  );
});

test("rechaza conexiones de usuarios inexistentes", async () => {
  const token = jwt.sign(
    { id: "000000000000000000000001", rol: "cliente" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );

  await assert.rejects(
    conectarCliente({ extraHeaders: { Cookie: `token=${token}` } }),
    /No autorizado/,
  );
});

test("rechaza conexiones de usuarios inactivos", async () => {
  const usuario = await crearUsuario({ estado: "inactivo" });

  await assert.rejects(
    conectarCliente({ extraHeaders: crearSesion(usuario) }),
    /No autorizado/,
  );
});

// ============================================================
// REVALIDACIÓN
// ============================================================

test("revalidarSocket devuelve true si el token sigue vigente y el usuario activo", async () => {
  const usuario = await crearUsuario();
  await conectarCliente({ extraHeaders: crearSesion(usuario) });

  const socketServidor = await socketServidorUnico();
  const resultado = await revalidarSocket(socketServidor);

  assert.equal(resultado, true);
  assert.equal(socketServidor.connected, true);
});

test("revalidarSocket expulsa al socket cuando el token venció", async () => {
  const usuario = await crearUsuario();
  const cliente = await conectarCliente({ extraHeaders: crearSesion(usuario) });

  const socketServidor = await socketServidorUnico();

  // Forzamos el vencimiento sin esperar una hora.
  socketServidor.data.expiraEn = Date.now() - 1;

  const esperandoExpiracion = esperarEvento(cliente, EVENTOS.SESION_EXPIRADA);
  const resultado = await revalidarSocket(socketServidor);

  assert.equal(resultado, false);
  await esperandoExpiracion;
  await esperarHasta(() => cliente.disconnected === true);
});

test("revalidarSocket expulsa al socket cuando el usuario fue desactivado", async () => {
  const usuario = await crearUsuario();
  const cliente = await conectarCliente({ extraHeaders: crearSesion(usuario) });

  const socketServidor = await socketServidorUnico();

  await Usuario.actualizar(usuario.id, { estado: "inactivo" });

  const esperandoExpiracion = esperarEvento(cliente, EVENTOS.SESION_EXPIRADA);
  const resultado = await revalidarSocket(socketServidor);

  assert.equal(resultado, false);
  await esperandoExpiracion;
  await esperarHasta(() => cliente.disconnected === true);
});
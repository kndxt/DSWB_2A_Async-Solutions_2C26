import test, { before, after, afterEach } from "node:test";
import assert from "node:assert/strict";

import {
  iniciarEntorno,
  cerrarEntorno,
  conectarCliente,
  cerrarClientes,
  esperarEvento,
  esperarHasta,
} from "../helpers/environment.js";
import { obtenerIO } from "../../sockets/index.js";
import { EVENTOS_ECO } from "../../sockets/ecoSocket.js";

before(() => iniciarEntorno({ sockets: true }));
after(cerrarEntorno);

// Cantidad de conexiones que el servidor tiene abiertas en este momento.
const conexionesActivas = () => obtenerIO().sockets.sockets.size;

// Cada prueba parte sin conexiones abiertas, para que los conteos sean exactos.
afterEach(async () => {
  cerrarClientes();
  await esperarHasta(() => conexionesActivas() === 0);
});

test("un cliente puede conectarse y recibe un identificador", async () => {
  const cliente = await conectarCliente();

  assert.equal(cliente.connected, true);
  assert.equal(typeof cliente.id, "string");

  await esperarHasta(() => conexionesActivas() === 1);
});

test("varios clientes pueden conectarse simultáneamente", async () => {
  const clientes = await Promise.all([conectarCliente(), conectarCliente(), conectarCliente()]);

  const identificadores = new Set(clientes.map((cliente) => cliente.id));
  assert.equal(identificadores.size, 3);

  await esperarHasta(() => conexionesActivas() === 3);
});

test("el servidor detecta la desconexión de un cliente", async () => {
  const [primero, segundo] = await Promise.all([conectarCliente(), conectarCliente()]);
  await esperarHasta(() => conexionesActivas() === 2);

  primero.disconnect();

  await esperarHasta(() => conexionesActivas() === 1);
  assert.equal(segundo.connected, true);
});

test("el evento eco responde únicamente al cliente que lo envió", async () => {
  const [emisor, otro] = await Promise.all([conectarCliente(), conectarCliente()]);

  let recibidosPorOtro = 0;
  otro.on(EVENTOS_ECO.ECO, () => {
    recibidosPorOtro += 1;
  });

  const respuesta = esperarEvento(emisor, EVENTOS_ECO.ECO);
  emisor.emit(EVENTOS_ECO.ECO, { texto: "hola" });

  assert.deepEqual(await respuesta, { texto: "hola" });

  // Se deja pasar un instante para comprobar que el otro cliente no recibió nada.
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(recibidosPorOtro, 0);
});

test("el evento de difusión llega a todos los clientes conectados", async () => {
  const clientes = await Promise.all([conectarCliente(), conectarCliente(), conectarCliente()]);

  const recepciones = clientes.map((cliente) => esperarEvento(cliente, EVENTOS_ECO.DIFUSION));
  clientes[0].emit(EVENTOS_ECO.DIFUSION, { texto: "para todos" });

  const resultados = await Promise.all(recepciones);

  for (const datos of resultados) {
    assert.deepEqual(datos, { texto: "para todos" });
  }
});

test("el servidor puede emitir un evento a todos los clientes", async () => {
  const clientes = await Promise.all([conectarCliente(), conectarCliente()]);

  const recepciones = clientes.map((cliente) => esperarEvento(cliente, "prueba:servidor"));
  obtenerIO().emit("prueba:servidor", { numero: 1 });

  const resultados = await Promise.all(recepciones);

  for (const datos of resultados) {
    assert.deepEqual(datos, { numero: 1 });
  }
});
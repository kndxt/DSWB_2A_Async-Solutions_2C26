import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

import { inicializarSockets, obtenerIO, cerrarSockets } from "../../../sockets/index.js";

// Las pruebas se ejecutan en orden y comparten la instancia del módulo.

test("obtenerIO falla si Socket.IO no fue inicializado", () => {
  assert.throws(() => obtenerIO(), /no fue inicializado/);
});

test("inicializarSockets reutiliza la instancia existente", async () => {
  const primera = inicializarSockets(http.createServer());
  const segunda = inicializarSockets(http.createServer());

  assert.strictEqual(primera, segunda);
  assert.strictEqual(obtenerIO(), primera);

  await cerrarSockets();
});

test("cerrarSockets libera la instancia y puede llamarse más de una vez", async () => {
  inicializarSockets(http.createServer());

  await cerrarSockets();
  assert.throws(() => obtenerIO(), /no fue inicializado/);

  // Llamarla de nuevo sin instancia no debe fallar.
  await cerrarSockets();
});
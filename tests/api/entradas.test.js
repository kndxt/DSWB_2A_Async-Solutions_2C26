import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import {
  iniciarEntorno, cerrarEntorno, peticion, respuestaJSON,
  crearUsuario, crearSala, crearEvento, crearEntrada, Entrada,
} from "../helpers/environment.js";

before(iniciarEntorno);
after(cerrarEntorno);

test("POST /entradas vende una entrada para evento y usuario válidos", async () => {
  const sala = await crearSala();
  const usuario = await crearUsuario();
  const evento = await crearEvento({ sala, usuario });
  const response = await peticion("/entradas", { method: "POST", body: { eventoId: evento.id, usuarioId: usuario.id } });
  const body = await respuestaJSON(response);
  assert.equal(response.status, 201);
  assert.equal(body.eventoId, evento.id);
  assert.equal(body.usuarioId, usuario.id);
  const creada = await Entrada.findById(body.id);
  const { registrarCreado } = await import("../helpers/environment.js");
  registrarCreado(Entrada, creada);
});

test("POST /entradas rechaza IDs inválidos, evento inexistente y usuario inexistente", async () => {
  const invalido = await peticion("/entradas", { method: "POST", body: { eventoId: "mal", usuarioId: "mal" } });
  const inexistente = await peticion("/entradas", { method: "POST", body: { eventoId: "000000000000000000000001", usuarioId: "000000000000000000000001" } });
  assert.equal(invalido.status, 400);
  assert.equal(inexistente.status, 404);
});

test("POST /entradas rechaza evento cancelado, finalizado y usuario inactivo", async () => {
  const sala = await crearSala();
  const usuario = await crearUsuario();
  const cancelado = await crearEvento({ sala, usuario, overrides: { estado: "cancelado" } });
  const usuarioInactivo = await crearUsuario({ estado: "inactivo" });
  const ventaCancelado = await peticion("/entradas", { method: "POST", body: { eventoId: cancelado.id, usuarioId: usuario.id } });
  const eventoFinalizado = await crearEvento({ overrides: { estado: "finalizado", fechaInicioVenta: new Date(Date.now() - 86400000).toISOString(), fechaFinVenta: new Date(Date.now() + 86400000).toISOString() } });
  const ventaFinalizado = await peticion("/entradas", { method: "POST", body: { eventoId: eventoFinalizado.id, usuarioId: usuario.id } });
  const eventoActivo = await crearEvento();
  const ventaInactivo = await peticion("/entradas", { method: "POST", body: { eventoId: eventoActivo.id, usuarioId: usuarioInactivo.id } });
  assert.equal(ventaCancelado.status, 400);
  assert.equal(ventaFinalizado.status, 400);
  assert.equal(ventaInactivo.status, 400);
});

test("PATCH /entradas/:id/cancelar cancela una entrada y rechaza cancelación repetida", async () => {
  const entrada = await crearEntrada();
  const primera = await peticion(`/entradas/${entrada.id}/cancelar`, { method: "PATCH" });
  const segunda = await peticion(`/entradas/${entrada.id}/cancelar`, { method: "PATCH" });
  assert.equal(primera.status, 200);
  assert.equal((await respuestaJSON(primera)).estado, "cancelada");
  assert.equal(segunda.status, 400);
});

test("PATCH /entradas/:id/cancelar distingue ID inválido y entrada inexistente", async () => {
  assert.equal((await peticion("/entradas/no-es-id/cancelar", { method: "PATCH" })).status, 400);
  assert.equal((await peticion("/entradas/000000000000000000000001/cancelar", { method: "PATCH" })).status, 400);
});

test("GET /entradas, /:id, /vendidas/:eventoId y /disponibles/:eventoId funcionan", async () => {
  const sala = await crearSala({ capacidad: 3 });
  const usuario = await crearUsuario();
  const evento = await crearEvento({ sala, usuario });
  const entrada = await crearEntrada({ evento, usuario });
  const todas = await peticion("/entradas");
  const una = await peticion(`/entradas/${entrada.id}`);
  const vendidas = await peticion(`/entradas/vendidas/${evento.id}`);
  const disponibles = await peticion(`/entradas/disponibles/${evento.id}`);
  assert.equal(todas.status, 200);
  assert.ok(Array.isArray(await respuestaJSON(todas)));
  assert.equal(una.status, 200);
  assert.equal((await respuestaJSON(una)).id, entrada.id);
  assert.equal(vendidas.status, 200);
  assert.ok((await respuestaJSON(vendidas)).some((item) => item.id === entrada.id));
  assert.equal(disponibles.status, 200);
  assert.equal((await respuestaJSON(disponibles)).disponibles, 2);
});

test("GET de entradas rechaza IDs inválidos y devuelve 404 para evento inexistente", async () => {
  const invalida = await peticion("/entradas/nope");
  const vendidasInvalido = await peticion("/entradas/vendidas/nope");
  const disponiblesInexistente = await peticion("/entradas/disponibles/000000000000000000000001");
  assert.equal(invalida.status, 400);
  assert.equal(vendidasInvalido.status, 400);
  assert.equal(disponiblesInexistente.status, 404);
});

test("POST /entradas rechaza la venta cuando la capacidad está completa", async () => {
  const sala = await crearSala({ capacidad: 1 });
  const usuario = await crearUsuario();
  const evento = await crearEvento({ sala, usuario });
  const existente = await crearEntrada({ evento, usuario });
  assert.ok(existente.id);
  const response = await peticion("/entradas", {
    method: "POST",
    body: { eventoId: evento.id, usuarioId: usuario.id },
  });
  assert.equal(response.status, 400);
});

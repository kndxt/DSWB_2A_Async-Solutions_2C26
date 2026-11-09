import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import {
  iniciarEntorno,
  cerrarEntorno,
  peticion,
  respuestaJSON,
  crearUsuario,
  crearSala,
  crearEvento,
  fechasEvento,
  Evento,
} from "../helpers/environment.js";

before(iniciarEntorno);
after(cerrarEntorno);

function bodyEvento({ salaId, usuarioId, overrides = {} }) {
  return {
    nombre: `Evento API ${Date.now()}_${Math.random()}`,
    tipo: "Teatro",
    ...fechasEvento(),
    precioEntrada: 2500,
    salaId: String(salaId),
    usuarioId: String(usuarioId),
    ...overrides,
  };
}

test("GET /eventos devuelve array, GET por ID devuelve evento y /proximos devuelve array", async () => {
  const evento = await crearEvento();
  const todas = await peticion("/eventos");
  const una = await peticion(`/eventos/${evento.id}`);
  const proximos = await peticion("/eventos/proximos");
  assert.equal(todas.status, 200);
  assert.ok(Array.isArray(await respuestaJSON(todas)));
  assert.equal(una.status, 200);
  assert.equal((await respuestaJSON(una)).id, evento.id);
  assert.equal(proximos.status, 200);
  assert.ok(Array.isArray(await respuestaJSON(proximos)));
});

test("GET /eventos/:id distingue ID inválido y evento inexistente", async () => {
  assert.equal((await peticion("/eventos/invalido")).status, 400);
  assert.equal((await peticion("/eventos/000000000000000000000001")).status, 404);
});

test("POST /eventos crea evento válido y genera reserva en el servidor", async () => {
  const sala = await crearSala();
  const usuario = await crearUsuario();
  const response = await peticion("/eventos", {
    method: "POST",
    body: bodyEvento({
      salaId: sala.id,
      usuarioId: usuario.id,
      overrides: { reserva: { precioFinal: 999999 } },
    }),
  });
  const body = await respuestaJSON(response);
  assert.equal(response.status, 201);
  assert.equal(body.reserva.precioFinal, sala.precioReserva);
  assert.equal(body.reserva.usuarioId, usuario.id);
  const creado = await Evento.findById(body.id);
  const { registrarCreado } = await import("../helpers/environment.js");
  registrarCreado(Evento, creado);
});

test("POST /eventos rechaza ausencia de usuario, sala inexistente y usuario inexistente", async () => {
  const sala = await crearSala();
  const usuario = await crearUsuario();
  const sinUsuario = await peticion("/eventos", {
    method: "POST",
    body: { ...bodyEvento({ salaId: sala.id, usuarioId: usuario.id }), usuarioId: undefined },
  });
  const salaNoExiste = await peticion("/eventos", {
    method: "POST",
    body: bodyEvento({ salaId: "000000000000000000000001", usuarioId: usuario.id }),
  });
  const usuarioNoExiste = await peticion("/eventos", {
    method: "POST",
    body: bodyEvento({ salaId: sala.id, usuarioId: "000000000000000000000001" }),
  });
  assert.equal(sinUsuario.status, 400);
  assert.equal(salaNoExiste.status, 400);
  assert.equal(usuarioNoExiste.status, 400);
});

test("POST /eventos rechaza precio negativo y fechas incoherentes", async () => {
  const sala = await crearSala();
  const usuario = await crearUsuario();
  const negativo = await peticion("/eventos", {
    method: "POST",
    body: bodyEvento({ salaId: sala.id, usuarioId: usuario.id, overrides: { precioEntrada: -1 } }),
  });
  const fechas = fechasEvento();
  fechas.fechaFin = new Date(new Date(fechas.fechaInicio).getTime() - 86400000).toISOString();
  const incoherente = await peticion("/eventos", {
    method: "POST",
    body: bodyEvento({ salaId: sala.id, usuarioId: usuario.id, overrides: fechas }),
  });
  assert.equal(negativo.status, 400);
  assert.equal(incoherente.status, 400);
});

test("POST /eventos rechaza sala y usuario inactivos", async () => {
  const sala = await crearSala({ estado: "inactiva" });
  const usuario = await crearUsuario({ estado: "inactivo" });
  const response = await peticion("/eventos", {
    method: "POST",
    body: bodyEvento({ salaId: sala.id, usuarioId: usuario.id }),
  });
  assert.equal(response.status, 400);
});

test("PUT /eventos/:id permite PATCH-like update de un solo campo y protege reserva", async () => {
  const evento = await crearEvento();
  const response = await peticion(`/eventos/${evento.id}`, {
    method: "PUT",
    body: { descripcion: "Descripción actualizada", reserva: { precioFinal: 1 } },
  });
  const body = await respuestaJSON(response);
  assert.equal(response.status, 200);
  assert.equal(body.descripcion, "Descripción actualizada");
  assert.equal(body.reserva.precioFinal, evento.reserva.precioFinal);
});

test("PUT /eventos/:id rechaza estado inválido, precio negativo y fechas incoherentes", async () => {
  const evento = await crearEvento();
  const estado = await peticion(`/eventos/${evento.id}`, {
    method: "PUT",
    body: { estado: "otro" },
  });
  const precio = await peticion(`/eventos/${evento.id}`, {
    method: "PUT",
    body: { precioEntrada: -1 },
  });
  const fecha = await peticion(`/eventos/${evento.id}`, {
    method: "PUT",
    body: { fechaFin: "2020-01-01" },
  });
  assert.equal(estado.status, 400);
  assert.equal(precio.status, 400);
  assert.equal(fecha.status, 400);
});

test("PUT /eventos/:id distingue ID inválido y evento inexistente", async () => {
  assert.equal((await peticion("/eventos/invalido", { method: "PUT", body: {} })).status, 400);
  assert.equal(
    (await peticion("/eventos/000000000000000000000001", { method: "PUT", body: {} })).status,
    404,
  );
});

test("POST /eventos rechaza un rango que se superpone con otro evento de la misma sala", async () => {
  const sala = await crearSala();
  const usuario = await crearUsuario();
  const existente = await crearEvento({ sala, usuario, dias: 45 });
  const fechaInicio = new Date(
    new Date(existente.fechaInicio).getTime() + 60 * 60 * 1000,
  ).toISOString();
  const fechaFin = new Date(new Date(existente.fechaFin).getTime() + 60 * 60 * 1000).toISOString();
  const response = await peticion("/eventos", {
    method: "POST",
    body: {
      ...bodyEvento({ salaId: sala.id, usuarioId: usuario.id }),
      fechaInicio,
      fechaFin,
    },
  });
  assert.equal(response.status, 400);
});

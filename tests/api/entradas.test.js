
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
  crearEntrada,
  registrarCreado,
  mongoose,
  Sala,
  Entrada,
} from "../helpers/environment.js";

before(iniciarEntorno);
after(cerrarEntorno);

// IDs utilizados para comprobar validaciones y recursos inexistentes.
const ID_INVALIDO = "no-es-un-objectId";
const ID_INEXISTENTE = new mongoose.Types.ObjectId().toString();

// Comprueba el código HTTP y el mensaje de una respuesta de error.
async function assertError(response, status, mensaje) {
  assert.equal(response.status, status);

  const body = await respuestaJSON(response);
  assert.equal(body.error, mensaje);
}


// ============================================================
// VENTA DE ENTRADAS
// ============================================================

test("POST /entradas vende una entrada para evento y usuario válidos", async () => {
  const sala = await crearSala();
  const usuario = await crearUsuario();
  const evento = await crearEvento({ sala, usuario });

  const response = await peticion("/entradas", {
    method: "POST",
    body: {
      eventoId: evento.id,
      usuarioId: usuario.id,
    },
  });

  const body = await respuestaJSON(response);

  assert.equal(response.status, 201);
  assert.equal(body.eventoId, evento.id);
  assert.equal(body.usuarioId, usuario.id);

  // Registra la entrada creada por la API para limpiarla al finalizar.
  const creada = await Entrada.findById(body.id);
  registrarCreado(Entrada, creada);
});

test("POST /entradas rechaza IDs inválidos y recursos inexistentes", async () => {
  const invalido = await peticion("/entradas", {
    method: "POST",
    body: {
      eventoId: ID_INVALIDO,
      usuarioId: ID_INVALIDO,
    },
  });

  assert.equal(invalido.status, 400);

  // Evento inexistente.
  const eventoInexistente = await peticion("/entradas", {
    method: "POST",
    body: {
      eventoId: ID_INEXISTENTE,
      usuarioId: ID_INEXISTENTE,
    },
  });

  await assertError(eventoInexistente, 404, "Evento no encontrado");

  // Evento válido, pero cliente inexistente.
  const evento = await crearEvento();

  const usuarioInexistente = await peticion("/entradas", {
    method: "POST",
    body: {
      eventoId: evento.id,
      usuarioId: ID_INEXISTENTE,
    },
  });

  await assertError(usuarioInexistente, 404, "Cliente no encontrado");
});


// ============================================================
// RESTRICCIONES DE VENTA
// ============================================================

test("POST /entradas rechaza eventos que no admiten nuevas ventas", async () => {
  const sala = await crearSala();
  const usuario = await crearUsuario();

  const cancelado = await crearEvento({
    sala,
    usuario,
    overrides: { estado: "cancelado" },
  });

  const finalizado = await crearEvento({
    sala,
    usuario,
    overrides: {
      estado: "finalizado",
      fechaInicioVenta: new Date(Date.now() - 86400000).toISOString(),
      fechaFinVenta: new Date(Date.now() + 86400000).toISOString(),
    },
  });

  const ventaCancelado = await peticion("/entradas", {
    method: "POST",
    body: {
      eventoId: cancelado.id,
      usuarioId: usuario.id,
    },
  });

  const ventaFinalizado = await peticion("/entradas", {
    method: "POST",
    body: {
      eventoId: finalizado.id,
      usuarioId: usuario.id,
    },
  });

  await assertError(
    ventaCancelado,
    409,
    "El evento no permite nuevas ventas"
  );

  await assertError(
    ventaFinalizado,
    409,
    "El evento no permite nuevas ventas"
  );
});

test("POST /entradas rechaza la compra de un cliente inactivo", async () => {
  const usuario = await crearUsuario({ estado: "inactivo" });
  const evento = await crearEvento();

  const response = await peticion("/entradas", {
    method: "POST",
    body: {
      eventoId: evento.id,
      usuarioId: usuario.id,
    },
  });

  await assertError(response, 409, "El cliente está inactivo");
});

test("POST /entradas rechaza la venta cuando la capacidad está completa", async () => {
  const sala = await crearSala({ capacidad: 1 });
  const usuario = await crearUsuario();
  const evento = await crearEvento({ sala, usuario });

  const existente = await crearEntrada({ evento, usuario });
  assert.ok(existente.id);

  const response = await peticion("/entradas", {
    method: "POST",
    body: {
      eventoId: evento.id,
      usuarioId: usuario.id,
    },
  });

  await assertError(
    response,
    409,
    "El evento ya alcanzó su capacidad máxima"
  );
});

test("POST /entradas rechaza eventos cuya sala asociada no existe", async () => {
  const sala = await crearSala();
  const usuario = await crearUsuario();
  const evento = await crearEvento({ sala, usuario });

  // Elimina la sala para simular una referencia inexistente.
  await Sala.findByIdAndDelete(sala.id);

  const response = await peticion("/entradas", {
    method: "POST",
    body: {
      eventoId: evento.id,
      usuarioId: usuario.id,
    },
  });

  await assertError(
    response,
    404,
    "La sala asociada al evento no existe"
  );
});


// ============================================================
// CANCELACIÓN DE ENTRADAS
// ============================================================

test("PATCH /entradas/:id/cancelar cancela una entrada", async () => {
  const entrada = await crearEntrada();

  const response = await peticion(
    `/entradas/${entrada.id}/cancelar`,
    { method: "PATCH" }
  );

  const body = await respuestaJSON(response);

  assert.equal(response.status, 200);
  assert.equal(body.estado, "cancelada");
});

test("PATCH /entradas/:id/cancelar rechaza una cancelación repetida", async () => {
  const entrada = await crearEntrada();

  await peticion(`/entradas/${entrada.id}/cancelar`, {
    method: "PATCH",
  });

  const response = await peticion(
    `/entradas/${entrada.id}/cancelar`,
    { method: "PATCH" }
  );

  await assertError(
    response,
    409,
    "Entrada no encontrada o ya está cancelada"
  );
});

test("PATCH /entradas/:id/cancelar rechaza IDs inválidos y entradas inexistentes", async () => {
  const invalida = await peticion(
    `/entradas/${ID_INVALIDO}/cancelar`,
    { method: "PATCH" }
  );

  assert.equal(invalida.status, 400);

  const inexistente = await peticion(
    `/entradas/${ID_INEXISTENTE}/cancelar`,
    { method: "PATCH" }
  );

  await assertError(
    inexistente,
    409,
    "Entrada no encontrada o ya está cancelada"
  );
});


// ============================================================
// CONSULTAS DE ENTRADAS
// ============================================================

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
  assert.ok(
    (await respuestaJSON(vendidas)).some(
      (item) => item.id === entrada.id
    )
  );

  assert.equal(disponibles.status, 200);
  assert.equal((await respuestaJSON(disponibles)).disponibles, 2);
});

test("GET de entradas rechaza IDs inválidos y recursos inexistentes", async () => {
  // Identificador de entrada inválido.
  const entradaInvalida = await peticion(`/entradas/${ID_INVALIDO}`);
  assert.equal(entradaInvalida.status, 400);

  // Entrada inexistente con un identificador válido.
  const entradaInexistente = await peticion(`/entradas/${ID_INEXISTENTE}`);

  await assertError(
    entradaInexistente,
    404,
    "Entrada no encontrada"
  );

  // Identificadores inválidos para consultas por evento.
  const vendidasInvalido = await peticion(
    `/entradas/vendidas/${ID_INVALIDO}`
  );

  const disponiblesInvalido = await peticion(
    `/entradas/disponibles/${ID_INVALIDO}`
  );

  assert.equal(vendidasInvalido.status, 400);
  assert.equal(disponiblesInvalido.status, 400);

  // Evento inexistente.
  const vendidasInexistente = await peticion(
    `/entradas/vendidas/${ID_INEXISTENTE}`
  );

  const disponiblesInexistente = await peticion(
    `/entradas/disponibles/${ID_INEXISTENTE}`
  );

  await assertError(
    vendidasInexistente,
    404,
    "Evento no encontrado"
  );

  await assertError(
    disponiblesInexistente,
    404,
    "Evento no encontrado"
  );
});

test("GET /entradas/disponibles/:eventoId rechaza eventos cuya sala no existe", async () => {
  const sala = await crearSala();
  const usuario = await crearUsuario();
  const evento = await crearEvento({ sala, usuario });

  await Sala.findByIdAndDelete(sala.id);

  const response = await peticion(
    `/entradas/disponibles/${evento.id}`
  );

  await assertError(
    response,
    404,
    "La sala asociada al evento no existe"
  );
});

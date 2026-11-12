import test, { before, after, describe } from "node:test";
import assert from "node:assert/strict";

import {
  iniciarEntorno,
  cerrarEntorno,
  peticion,
  respuestaJSON,
  crearSesion,
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

// Crea un cliente y devuelve sus datos junto con su sesión autenticada.
async function sesionCliente() {
  const usuario = await crearUsuario();

  return {
    usuario,
    headers: crearSesion(usuario),
  };
}

// ============================================================
// POST /entradas - VENTA
// ============================================================

describe("POST /entradas - venta", () => {
  test("vende una entrada para el evento del cliente autenticado", async () => {
    const sala = await crearSala();
    const { usuario, headers } = await sesionCliente();
    const evento = await crearEvento({ sala, usuario });

    const response = await peticion("/entradas", {
      method: "POST",
      headers,
      body: {
        eventoId: evento.id,
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

  test("utiliza el usuario autenticado aunque se envíe otro usuarioId en el body", async () => {
    const { usuario, headers } = await sesionCliente();
    const otroUsuario = await crearUsuario();
    const evento = await crearEvento();

    const response = await peticion("/entradas", {
      method: "POST",
      headers,
      body: {
        eventoId: evento.id,
        usuarioId: otroUsuario.id,
      },
    });

    const body = await respuestaJSON(response);

    assert.equal(response.status, 201);
    assert.equal(body.usuarioId, usuario.id);
    assert.notEqual(body.usuarioId, otroUsuario.id);

    const creada = await Entrada.findById(body.id);
    registrarCreado(Entrada, creada);
  });
});

// ============================================================
// POST /entradas - REGLAS DE NEGOCIO
// ============================================================

describe("POST /entradas - reglas de negocio", () => {
  test("rechaza un ID de evento inválido", async () => {
    const { headers } = await sesionCliente();

    const response = await peticion("/entradas", {
      method: "POST",
      headers,
      body: {
        eventoId: ID_INVALIDO,
      },
    });

    assert.equal(response.status, 400);
  });

  test("rechaza la venta para un evento inexistente", async () => {
    const { headers } = await sesionCliente();

    const response = await peticion("/entradas", {
      method: "POST",
      headers,
      body: {
        eventoId: ID_INEXISTENTE,
      },
    });

    await assertError(response, 404, "Evento no encontrado");
  });

  test("rechaza eventos que no admiten nuevas ventas", async () => {
    const sala = await crearSala();
    const { usuario, headers } = await sesionCliente();

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
      headers,
      body: {
        eventoId: cancelado.id,
      },
    });

    const ventaFinalizado = await peticion("/entradas", {
      method: "POST",
      headers,
      body: {
        eventoId: finalizado.id,
      },
    });

    await assertError(ventaCancelado, 409, "El evento no permite nuevas ventas");

    await assertError(ventaFinalizado, 409, "El evento no permite nuevas ventas");
  });

  test("rechaza la venta cuando la capacidad del evento está completa", async () => {
    const sala = await crearSala({ capacidad: 1 });
    const { usuario, headers } = await sesionCliente();
    const evento = await crearEvento({ sala, usuario });

    const existente = await crearEntrada({ evento, usuario });
    assert.ok(existente.id);

    const response = await peticion("/entradas", {
      method: "POST",
      headers,
      body: {
        eventoId: evento.id,
      },
    });

    await assertError(response, 409, "El evento ya alcanzó su capacidad máxima");
  });

  test("rechaza la venta cuando la sala asociada al evento no existe", async () => {
    const sala = await crearSala();
    const { usuario, headers } = await sesionCliente();
    const evento = await crearEvento({ sala, usuario });

    // Elimina la sala para simular una referencia inexistente.
    await Sala.findByIdAndDelete(sala.id);

    const response = await peticion("/entradas", {
      method: "POST",
      headers,
      body: {
        eventoId: evento.id,
      },
    });

    await assertError(response, 404, "Sala no encontrada");
  });
});

// ============================================================
// PATCH /entradas/:id/cancelar - CANCELACIÓN
// ============================================================

describe("PATCH /entradas/:id/cancelar - cancelación", () => {
  test("cancela una entrada existente", async () => {
    const { headers } = await sesionCliente();
    const entrada = await crearEntrada();

    const response = await peticion(`/entradas/${entrada.id}/cancelar`, {
      method: "PATCH",
      headers,
    });

    const body = await respuestaJSON(response);

    assert.equal(response.status, 200);
    assert.equal(body.estado, "cancelada");
  });

  test("rechaza una cancelación repetida", async () => {
    const { headers } = await sesionCliente();
    const entrada = await crearEntrada();

    await peticion(`/entradas/${entrada.id}/cancelar`, {
      method: "PATCH",
      headers,
    });

    const response = await peticion(`/entradas/${entrada.id}/cancelar`, {
      method: "PATCH",
      headers,
    });

    await assertError(response, 409, "Entrada no encontrada o ya está cancelada");
  });

  test("rechaza un ID de entrada inválido", async () => {
    const { headers } = await sesionCliente();

    const response = await peticion(`/entradas/${ID_INVALIDO}/cancelar`, {
      method: "PATCH",
      headers,
    });

    assert.equal(response.status, 400);
  });

  test("rechaza la cancelación de una entrada inexistente", async () => {
    const { headers } = await sesionCliente();

    const response = await peticion(`/entradas/${ID_INEXISTENTE}/cancelar`, {
      method: "PATCH",
      headers,
    });

    await assertError(response, 409, "Entrada no encontrada o ya está cancelada");
  });
});

// ============================================================
// GET /entradas - CONSULTAS
// ============================================================

describe("GET /entradas - consultas", () => {
  test("obtiene todas las entradas", async () => {
    const { headers } = await sesionCliente();

    const response = await peticion("/entradas", { headers });

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(await respuestaJSON(response)));
  });

  test("obtiene una entrada por su ID", async () => {
    const { headers } = await sesionCliente();
    const entrada = await crearEntrada();

    const response = await peticion(`/entradas/${entrada.id}`, {
      headers,
    });

    const body = await respuestaJSON(response);

    assert.equal(response.status, 200);
    assert.equal(body.id, entrada.id);
  });

  test("obtiene las entradas vendidas de un evento", async () => {
    const { usuario, headers } = await sesionCliente();
    const evento = await crearEvento({ usuario });
    const entrada = await crearEntrada({ evento, usuario });

    const response = await peticion(`/entradas/vendidas/${evento.id}`, { headers });

    const body = await respuestaJSON(response);

    assert.equal(response.status, 200);
    assert.ok(body.some((item) => item.id === entrada.id));
  });

  test("obtiene la cantidad de entradas disponibles de un evento", async () => {
    const sala = await crearSala({ capacidad: 3 });
    const { usuario, headers } = await sesionCliente();
    const evento = await crearEvento({ sala, usuario });

    await crearEntrada({ evento, usuario });

    const response = await peticion(`/entradas/disponibles/${evento.id}`, { headers });

    const body = await respuestaJSON(response);

    assert.equal(response.status, 200);
    assert.equal(body.disponibles, 2);
  });
});

// ============================================================
// GET /entradas - VALIDACIONES
// ============================================================

describe("GET /entradas - validaciones", () => {
  test("rechaza un ID de entrada inválido", async () => {
    const { headers } = await sesionCliente();

    const response = await peticion(`/entradas/${ID_INVALIDO}`, {
      headers,
    });

    assert.equal(response.status, 400);
  });

  test("rechaza la consulta de una entrada inexistente", async () => {
    const { headers } = await sesionCliente();

    const response = await peticion(`/entradas/${ID_INEXISTENTE}`, { headers });

    await assertError(response, 404, "Entrada no encontrada");
  });

  test("rechaza IDs de evento inválidos en las consultas por evento", async () => {
    const { headers } = await sesionCliente();

    const vendidas = await peticion(`/entradas/vendidas/${ID_INVALIDO}`, { headers });

    const disponibles = await peticion(`/entradas/disponibles/${ID_INVALIDO}`, { headers });

    assert.equal(vendidas.status, 400);
    assert.equal(disponibles.status, 400);
  });

  test("rechaza consultas de entradas para un evento inexistente", async () => {
    const { headers } = await sesionCliente();

    const vendidas = await peticion(`/entradas/vendidas/${ID_INEXISTENTE}`, { headers });

    const disponibles = await peticion(`/entradas/disponibles/${ID_INEXISTENTE}`, { headers });

    await assertError(vendidas, 404, "Evento no encontrado");
    await assertError(disponibles, 404, "Evento no encontrado");
  });

  test("rechaza consultar entradas disponibles cuando la sala no existe", async () => {
    const sala = await crearSala();
    const { usuario, headers } = await sesionCliente();
    const evento = await crearEvento({ sala, usuario });

    await Sala.findByIdAndDelete(sala.id);

    const response = await peticion(`/entradas/disponibles/${evento.id}`, { headers });

    await assertError(response, 404, "Sala no encontrada");
  });
});

// ============================================================
// AUTENTICACIÓN DE ENTRADAS
// ============================================================

describe("Autenticación de entradas", () => {
  test("rechaza consultar entradas sin una sesión autenticada", async () => {
    const response = await peticion("/entradas");

    assert.equal(response.status, 401);
  });

  test("rechaza vender entradas sin una sesión autenticada", async () => {
    const response = await peticion("/entradas", {
      method: "POST",
      body: {
        eventoId: ID_INEXISTENTE,
      },
    });

    assert.equal(response.status, 401);
  });

  test("rechaza cancelar entradas sin una sesión autenticada", async () => {
    const response = await peticion(`/entradas/${ID_INEXISTENTE}/cancelar`, { method: "PATCH" });

    assert.equal(response.status, 401);
  });

  test("rechaza vender entradas con una sesión de usuario inactivo", async () => {
    const usuarioInactivo = await crearUsuario({ estado: "inactivo" });
    const headers = crearSesion(usuarioInactivo);

    const response = await peticion("/entradas", {
      method: "POST",
      headers,
      body: {
        eventoId: ID_INEXISTENTE,
      },
    });

    assert.equal(response.status, 403);
  });
});

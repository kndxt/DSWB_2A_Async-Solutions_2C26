import test, { before, after, describe } from "node:test";
import assert from "node:assert/strict";

import {
  iniciarEntorno,
  cerrarEntorno,
  peticion,
  respuestaJSON,
  crearSesion,
  crearUsuario,
  crearEvento,
} from "../helpers/environment.js";

before(iniciarEntorno);
after(cerrarEntorno);

// ---------------------------------------------------------------
// Helpers específicos de esta suite
// ---------------------------------------------------------------

/**
 * Crea un usuario administrador real en MongoDB y devuelve
 * los encabezados necesarios para autenticar sus peticiones.
 */
async function sesionAdmin() {
  const admin = await crearUsuario({ rol: "admin" });
  return crearSesion(admin);
}

/**
 * Crea un usuario cliente real en MongoDB y devuelve
 * tanto el usuario como los encabezados de autenticación.
 *
 * Se devuelve el usuario para poder asociarle reservas
 * y comprobar la titularidad de cada consulta.
 */
async function sesionCliente() {
  const cliente = await crearUsuario({ rol: "cliente" });

  return {
    usuario: cliente,
    headers: crearSesion(cliente),
  };
}

// ---------------------------------------------------------------
// Autenticación y autorización
// Verifica los requisitos de acceso a las consultas de reservas
// ---------------------------------------------------------------

describe("Autenticación y autorización de reservas", () => {
  test("rechaza consultar todas las reservas sin una sesión autenticada", async () => {
    const response = await peticion("/reservas");

    assert.equal(response.status, 401);
  });

  test("rechaza consultar una reserva individual sin una sesión autenticada", async () => {
    const response = await peticion("/reservas/000000000000000000000001");

    assert.equal(response.status, 401);
  });

  test("permite a un cliente consultar una reserva de su titularidad", async () => {
    const { usuario, headers } = await sesionCliente();
    const evento = await crearEvento({ usuario });

    const response = await peticion(`/reservas/${evento.id}`, {
      headers,
    });

    const reserva = await respuestaJSON(response);

    assert.equal(response.status, 200);
    assert.equal(reserva.evento.id, evento.id);
    assert.equal(reserva.usuario.id, usuario.id);
  });

  test("permite a un administrador consultar una reserva de cualquier cliente", async () => {
    const headers = await sesionAdmin();
    const cliente = await crearUsuario({ rol: "cliente" });
    const evento = await crearEvento({ usuario: cliente });

    const response = await peticion(`/reservas/${evento.id}`, {
      headers,
    });

    const reserva = await respuestaJSON(response);

    assert.equal(response.status, 200);
    assert.equal(reserva.evento.id, evento.id);
    assert.equal(reserva.usuario.id, cliente.id);
  });

  test("no permite a un cliente consultar una reserva de otro usuario", async () => {
    const { headers } = await sesionCliente();
    const otroCliente = await crearUsuario({ rol: "cliente" });
    const eventoAjeno = await crearEvento({ usuario: otroCliente });

    const response = await peticion(`/reservas/${eventoAjeno.id}`, {
      headers,
    });

    assert.equal(response.status, 404);
  });
});

// ---------------------------------------------------------------
// GET /reservas
// Consulta del listado de reservas según el rol y el titular
// ---------------------------------------------------------------

describe("GET /reservas", () => {
  test("devuelve todas las reservas a un administrador", async () => {
    const headers = await sesionAdmin();
    const usuario = await crearUsuario();
    const evento = await crearEvento({ usuario });

    const response = await peticion("/reservas", { headers });
    const reservas = await respuestaJSON(response);

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(reservas));
    assert.ok(reservas.some((reserva) => reserva.evento.id === evento.id));
  });

  test("permite a un administrador filtrar las reservas por usuarioId", async () => {
    const headers = await sesionAdmin();
    const usuario = await crearUsuario();
    const otroUsuario = await crearUsuario();

    const evento = await crearEvento({ usuario });
    await crearEvento({ usuario: otroUsuario });

    const response = await peticion(`/reservas?usuarioId=${usuario.id}`, { headers });

    const reservas = await respuestaJSON(response);

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(reservas));
    assert.ok(reservas.length > 0);

    assert.ok(reservas.some((reserva) => reserva.evento.id === evento.id));

    assert.ok(reservas.every((reserva) => reserva.usuario.id === usuario.id));
  });

  test("devuelve únicamente las reservas del cliente autenticado", async () => {
    const { usuario, headers } = await sesionCliente();
    const eventoPropio = await crearEvento({ usuario });

    const otroUsuario = await crearUsuario({ rol: "cliente" });
    await crearEvento({ usuario: otroUsuario });

    const response = await peticion("/reservas", { headers });
    const reservas = await respuestaJSON(response);

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(reservas));
    assert.ok(reservas.some((reserva) => reserva.evento.id === eventoPropio.id));

    assert.ok(reservas.every((reserva) => reserva.usuario.id === usuario.id));
  });

  test("ignora el usuarioId solicitado por un cliente y devuelve solamente sus reservas", async () => {
    const { usuario, headers } = await sesionCliente();
    const eventoPropio = await crearEvento({ usuario });

    const otroUsuario = await crearUsuario({ rol: "cliente" });
    await crearEvento({ usuario: otroUsuario });

    const response = await peticion(`/reservas?usuarioId=${otroUsuario.id}`, { headers });

    const reservas = await respuestaJSON(response);

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(reservas));

    assert.ok(reservas.some((reserva) => reserva.evento.id === eventoPropio.id));

    assert.ok(reservas.every((reserva) => reserva.usuario.id === usuario.id));
  });

  test("devuelve un array vacío cuando el cliente no tiene reservas", async () => {
    const { headers } = await sesionCliente();

    const response = await peticion("/reservas", { headers });
    const reservas = await respuestaJSON(response);

    assert.equal(response.status, 200);
    assert.deepEqual(reservas, []);
  });

  test("rechaza un usuarioId inválido en el query", async () => {
    const headers = await sesionAdmin();

    const response = await peticion("/reservas?usuarioId=invalido", { headers });

    assert.equal(response.status, 400);
  });

  test("devuelve las reservas con los datos del evento y del usuario", async () => {
    const headers = await sesionAdmin();
    const usuario = await crearUsuario();
    const evento = await crearEvento({ usuario });

    const response = await peticion("/reservas", { headers });
    const reservas = await respuestaJSON(response);

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(reservas));

    const reserva = reservas.find((item) => item.evento.id === evento.id);

    assert.ok(reserva);
    assert.equal(reserva.evento.nombre, evento.nombre);
    assert.equal(reserva.usuario.id, usuario.id);
    assert.equal(reserva.precioFinal, evento.reserva.precioFinal);
    assert.ok(reserva.fechaReserva);
  });
});

// ---------------------------------------------------------------
// GET /reservas/:eventoId
// Consulta individual y validación de identificadores
// ---------------------------------------------------------------

describe("GET /reservas/:eventoId", () => {
  test("devuelve los datos de una reserva asociada al evento", async () => {
    const headers = await sesionAdmin();
    const usuario = await crearUsuario();
    const evento = await crearEvento({ usuario });

    const response = await peticion(`/reservas/${evento.id}`, {
      headers,
    });

    const reserva = await respuestaJSON(response);

    assert.equal(response.status, 200);
    assert.equal(reserva.evento.id, evento.id);
    assert.equal(reserva.evento.nombre, evento.nombre);
    assert.equal(reserva.usuario.id, usuario.id);
    assert.equal(reserva.precioFinal, evento.reserva.precioFinal);
    assert.ok(reserva.fechaReserva);
  });

  test("distingue entre un ID inválido y un evento inexistente", async () => {
    const headers = await sesionAdmin();

    const invalido = await peticion("/reservas/invalido", {
      headers,
    });

    const inexistente = await peticion("/reservas/000000000000000000000001", { headers });

    assert.equal(invalido.status, 400);
    assert.equal(inexistente.status, 404);
  });
});

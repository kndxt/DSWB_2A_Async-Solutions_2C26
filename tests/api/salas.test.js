import test, { before, after, describe } from "node:test";
import assert from "node:assert/strict";

import {
  iniciarEntorno,
  cerrarEntorno,
  peticion,
  respuestaJSON,
  crearSala,
  crearUsuario,
  crearSesion,
  crearEvento,
  registrarCreado,
  Sala,
  Evento,
} from "../helpers/environment.js";

import { ROLES_USUARIO } from "../../models/usuarioModel.js";

before(iniciarEntorno);
after(cerrarEntorno);

// Cada operación usa una sesión real con un usuario creado en MongoDB.
async function sesionAdmin() {
  const usuario = await crearUsuario({ rol: ROLES_USUARIO.ADMIN });
  return crearSesion(usuario);
}

async function sesionCliente() {
  const usuario = await crearUsuario({ rol: ROLES_USUARIO.CLIENTE });
  return crearSesion(usuario);
}

const datosSala = (overrides = {}) => ({
  nombre: `Sala API ${Date.now()}_${Math.random()}`,
  capacidad: 40,
  direccion: "Calle de prueba 123",
  precioReserva: 1000,
  responsable: {
    nombre: "Laura",
    apellido: "Pérez",
    telefono: "1112345678",
    email: `laura_${Date.now()}@example.test`,
  },
  ...overrides,
});

// ---------------------------------------------------------------
// GET /salas
// ---------------------------------------------------------------

describe("GET /salas - consultas", () => {
  test("devuelve un array de salas y permite obtener una por ID", async () => {
    const headers = await sesionAdmin();
    const sala = await crearSala();

    const todas = await peticion("/salas", { headers });
    const una = await peticion(`/salas/${sala.id}`, { headers });

    const salas = await respuestaJSON(todas);
    const salaIndividual = await respuestaJSON(una);

    assert.equal(todas.status, 200);
    assert.ok(Array.isArray(salas));

    assert.equal(una.status, 200);
    assert.equal(salaIndividual.id, sala.id);
  });

  test("distingue ID inválido y sala inexistente", async () => {
    const headers = await sesionAdmin();

    const invalido = await peticion("/salas/invalido", { headers });
    const inexistente = await peticion("/salas/000000000000000000000001", { headers });

    assert.equal(invalido.status, 400);
    assert.equal(inexistente.status, 404);
  });
});

// ---------------------------------------------------------------
// POST /salas
// ---------------------------------------------------------------

describe("POST /salas - creación", () => {
  test("crea una sala válida y permite precioReserva igual a cero", async () => {
    const headers = await sesionAdmin();

    const response = await peticion("/salas", {
      method: "POST",
      headers,
      body: datosSala({ precioReserva: 0 }),
    });

    const body = await respuestaJSON(response);

    assert.equal(response.status, 201);
    assert.equal(body.precioReserva, 0);

    const creada = await Sala.findById(body.id);
    registrarCreado(Sala, creada);
  });

  test("rechaza responsables ausentes o incompletos", async () => {
    const headers = await sesionAdmin();

    const sinResponsable = await peticion("/salas", {
      method: "POST",
      headers,
      body: datosSala({ responsable: undefined }),
    });

    const responsableNulo = await peticion("/salas", {
      method: "POST",
      headers,
      body: datosSala({ responsable: null }),
    });

    const responsableIncompleto = await peticion("/salas", {
      method: "POST",
      headers,
      body: datosSala({
        responsable: {
          nombre: "Laura",
          telefono: "123456",
        },
      }),
    });

    const responsableVacio = await peticion("/salas", {
      method: "POST",
      headers,
      body: datosSala({ responsable: {} }),
    });

    for (const response of [
      sinResponsable,
      responsableNulo,
      responsableIncompleto,
      responsableVacio,
    ]) {
      assert.equal(response.status, 400);
    }
  });

  test("rechaza strings vacíos y valores negativos", async () => {
    const headers = await sesionAdmin();

    const vacio = await peticion("/salas", {
      method: "POST",
      headers,
      body: datosSala({ nombre: "" }),
    });

    const negativoCapacidad = await peticion("/salas", {
      method: "POST",
      headers,
      body: datosSala({ capacidad: -1 }),
    });

    const negativoPrecio = await peticion("/salas", {
      method: "POST",
      headers,
      body: datosSala({ precioReserva: -1 }),
    });

    assert.equal(vacio.status, 400);
    assert.equal(negativoCapacidad.status, 400);
    assert.equal(negativoPrecio.status, 400);
  });

  test("permite crear salas con datos repetidos", async () => {
    const headers = await sesionAdmin();
    const datos = datosSala();

    const primera = await peticion("/salas", {
      method: "POST",
      headers,
      body: datos,
    });

    const segunda = await peticion("/salas", {
      method: "POST",
      headers,
      body: datos,
    });

    assert.equal(primera.status, 201);
    assert.equal(segunda.status, 201);

    const bodyPrimera = await respuestaJSON(primera);
    const bodySegunda = await respuestaJSON(segunda);

    registrarCreado(Sala, await Sala.findById(bodyPrimera.id));
    registrarCreado(Sala, await Sala.findById(bodySegunda.id));
  });
});

// ---------------------------------------------------------------
// PATCH /salas/:id
// ---------------------------------------------------------------

describe("PATCH /salas/:id - actualización", () => {
  test("actualiza campos y rechaza estado y capacidad inválidos", async () => {
    const headers = await sesionAdmin();
    const sala = await crearSala();

    const ok = await peticion(`/salas/${sala.id}`, {
      method: "PATCH",
      headers,
      body: {
        nombre: "Sala modificada",
        id: "000000000000000000000001",
      },
    });

    const estado = await peticion(`/salas/${sala.id}`, {
      method: "PATCH",
      headers,
      body: { estado: "cerrada" },
    });

    const capacidad = await peticion(`/salas/${sala.id}`, {
      method: "PATCH",
      headers,
      body: { capacidad: 0 },
    });

    assert.equal(ok.status, 200);
    assert.equal((await respuestaJSON(ok)).id, sala.id);
    assert.equal(estado.status, 400);
    assert.equal(capacidad.status, 400);
  });

  test("permite actualizar parcialmente el responsable", async () => {
    const headers = await sesionAdmin();
    const sala = await crearSala();

    const response = await peticion(`/salas/${sala.id}`, {
      method: "PATCH",
      headers,
      body: {
        responsable: {
          telefono: "99999999",
        },
      },
    });

    const body = await respuestaJSON(response);

    assert.equal(response.status, 200);
    assert.equal(body.responsable.telefono, "99999999");
    assert.equal(body.responsable.nombre, sala.responsable.nombre);
    assert.equal(body.responsable.apellido, sala.responsable.apellido);
    assert.equal(body.responsable.email, sala.responsable.email);
  });

  test("rechaza atributos del responsable con tipos incorrectos", async () => {
    const headers = await sesionAdmin();
    const sala = await crearSala();

    const response = await peticion(`/salas/${sala.id}`, {
      method: "PATCH",
      headers,
      body: {
        responsable: {
          nombre: 123,
        },
      },
    });

    assert.equal(response.status, 400);
  });

  test("distingue ID inválido y sala inexistente", async () => {
    const headers = await sesionAdmin();

    const invalido = await peticion("/salas/nope", {
      method: "PATCH",
      headers,
      body: {},
    });

    const inexistente = await peticion("/salas/000000000000000000000001", {
      method: "PATCH",
      headers,
      body: {},
    });

    assert.equal(invalido.status, 400);
    assert.equal(inexistente.status, 404);
  });

  test("impide inactivar una sala con eventos próximos activos", async () => {
    const headers = await sesionAdmin();
    const sala = await crearSala();

    await crearEvento({ sala });

    const response = await peticion(`/salas/${sala.id}`, {
      method: "PATCH",
      headers,
      body: { estado: "inactiva" },
    });

    const actualizada = await Sala.findById(sala.id);

    assert.equal(response.status, 409);
    assert.equal(actualizada.estado, "activa");
  });

  test("permite inactivar una sala con eventos próximos cancelados", async () => {
    const headers = await sesionAdmin();
    const sala = await crearSala();

    const evento = await crearEvento({ sala });

    await Evento.updateOne({ _id: evento.id }, { $set: { estado: "cancelado" } });

    const response = await peticion(`/salas/${sala.id}`, {
      method: "PATCH",
      headers,
      body: { estado: "inactiva" },
    });

    const actualizada = await Sala.findById(sala.id);

    assert.equal(response.status, 200);
    assert.equal(actualizada.estado, "inactiva");
  });

  test("permite inactivar una sala con eventos activos cuya fecha ya pasó", async () => {
    const headers = await sesionAdmin();
    const sala = await crearSala();

    const evento = await crearEvento({ sala });

    const fechaPasada = new Date();
    fechaPasada.setDate(fechaPasada.getDate() - 1);

    await Evento.updateOne({ _id: evento.id }, { $set: { fechaInicio: fechaPasada } });

    const response = await peticion(`/salas/${sala.id}`, {
      method: "PATCH",
      headers,
      body: { estado: "inactiva" },
    });

    const actualizada = await Sala.findById(sala.id);

    assert.equal(response.status, 200);
    assert.equal(actualizada.estado, "inactiva");
  });
});

// ---------------------------------------------------------------
// Autenticación y autorización
// ---------------------------------------------------------------

describe("Autenticación y autorización de salas", () => {
  test("todas las consultas requieren sesión", async () => {
    const sala = await crearSala();

    const todas = await peticion("/salas");
    const una = await peticion(`/salas/${sala.id}`);

    assert.equal(todas.status, 401);
    assert.equal(una.status, 401);
  });

  test("POST requiere sesión", async () => {
    const response = await peticion("/salas", {
      method: "POST",
      body: datosSala(),
    });

    assert.equal(response.status, 401);
  });

  test("PATCH requiere sesión", async () => {
    const sala = await crearSala();

    const response = await peticion(`/salas/${sala.id}`, {
      method: "PATCH",
      body: { nombre: "Sala modificada" },
    });

    assert.equal(response.status, 401);
  });

  test("GET rechaza a usuarios autenticados que no son administradores", async () => {
    const headers = await sesionCliente();
    const sala = await crearSala();

    const todas = await peticion("/salas", { headers });
    const una = await peticion(`/salas/${sala.id}`, { headers });

    assert.equal(todas.status, 403);
    assert.equal(una.status, 403);
  });

  test("POST rechaza a usuarios autenticados que no son administradores", async () => {
    const headers = await sesionCliente();

    const response = await peticion("/salas", {
      method: "POST",
      headers,
      body: datosSala(),
    });

    assert.equal(response.status, 403);
  });

  test("PATCH rechaza a usuarios autenticados que no son administradores", async () => {
    const headers = await sesionCliente();
    const sala = await crearSala();

    const response = await peticion(`/salas/${sala.id}`, {
      method: "PATCH",
      headers,
      body: { nombre: "Sala modificada" },
    });

    assert.equal(response.status, 403);
  });
});

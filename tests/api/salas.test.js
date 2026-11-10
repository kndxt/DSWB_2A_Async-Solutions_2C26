import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import {
  iniciarEntorno,
  cerrarEntorno,
  peticion,
  respuestaJSON,
  crearSala,
  Sala,
} from "../helpers/environment.js";

before(iniciarEntorno);
after(cerrarEntorno);

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

test("GET /salas devuelve un array y GET /salas/:id devuelve la sala", async () => {
  const sala = await crearSala();
  const todas = await peticion("/salas");
  const una = await peticion(`/salas/${sala.id}`);

  assert.equal(todas.status, 200);
  assert.ok(Array.isArray(await respuestaJSON(todas)));
  assert.equal(una.status, 200);
  assert.equal((await respuestaJSON(una)).id, sala.id);
});

test("GET /salas/:id distingue ID inválido y sala inexistente", async () => {
  assert.equal((await peticion("/salas/invalido")).status, 400);
  assert.equal((await peticion("/salas/000000000000000000000001")).status, 404);
});

test("POST /salas crea una sala válida y permite precioReserva igual a cero", async () => {
  const response = await peticion("/salas", {
    method: "POST",
    body: datosSala({ precioReserva: 0 }),
  });

  const body = await respuestaJSON(response);

  assert.equal(response.status, 201);
  assert.equal(body.precioReserva, 0);

  const creada = await Sala.findById(body.id);
  const { registrarCreado } = await import("../helpers/environment.js");
  registrarCreado(Sala, creada);
});

test("POST /salas rechaza responsables ausentes o incompletos", async () => {
  const sinResponsable = await peticion("/salas", {
    method: "POST",
    body: datosSala({ responsable: undefined }),
  });

  const responsableNulo = await peticion("/salas", {
    method: "POST",
    body: datosSala({ responsable: null }),
  });

  const responsableIncompleto = await peticion("/salas", {
    method: "POST",
    body: datosSala({
      responsable: {
        nombre: "Laura",
        telefono: "123456",
      },
    }),
  });

  const responsableVacio = await peticion("/salas", {
    method: "POST",
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

test("POST /salas rechaza strings vacíos y valores negativos", async () => {
  const vacio = await peticion("/salas", {
    method: "POST",
    body: datosSala({ nombre: "" }),
  });

  const negativoCapacidad = await peticion("/salas", {
    method: "POST",
    body: datosSala({ capacidad: -1 }),
  });

  const negativoPrecio = await peticion("/salas", {
    method: "POST",
    body: datosSala({ precioReserva: -1 }),
  });

  assert.equal(vacio.status, 400);
  assert.equal(negativoCapacidad.status, 400);
  assert.equal(negativoPrecio.status, 400);
});

test("POST /salas permite actualmente salas con datos repetidos", async () => {
  const datos = datosSala();

  const primera = await peticion("/salas", {
    method: "POST",
    body: datos,
  });

  const segunda = await peticion("/salas", {
    method: "POST",
    body: datos,
  });

  assert.equal(primera.status, 201);
  assert.equal(segunda.status, 201);

  const { registrarCreado } = await import("../helpers/environment.js");

  registrarCreado(Sala, await Sala.findById((await primera.json()).id));
  registrarCreado(Sala, await Sala.findById((await segunda.json()).id));
});

test("PATCH /salas/:id actualiza campos y rechaza estado y capacidad inválidos", async () => {
  const sala = await crearSala();

  const ok = await peticion(`/salas/${sala.id}`, {
    method: "PATCH",
    body: {
      nombre: "Sala modificada",
      id: "000000000000000000000001",
    },
  });

  const estado = await peticion(`/salas/${sala.id}`, {
    method: "PATCH",
    body: { estado: "cerrada" },
  });

  const capacidad = await peticion(`/salas/${sala.id}`, {
    method: "PATCH",
    body: { capacidad: 0 },
  });

  assert.equal(ok.status, 200);
  assert.equal((await respuestaJSON(ok)).id, sala.id);
  assert.equal(estado.status, 400);
  assert.equal(capacidad.status, 400);
});

test("PATCH /salas/:id permite actualizar parcialmente el responsable", async () => {
  const sala = await crearSala();

  const response = await peticion(`/salas/${sala.id}`, {
    method: "PATCH",
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

test("PATCH /salas/:id rechaza atributos del responsable con tipos incorrectos", async () => {
  const sala = await crearSala();

  const response = await peticion(`/salas/${sala.id}`, {
    method: "PATCH",
    body: {
      responsable: {
        nombre: 123,
      },
    },
  });

  assert.equal(response.status, 400);
});

test("PATCH /salas/:id distingue ID inválido y sala inexistente", async () => {
  assert.equal(
    (
      await peticion("/salas/nope", {
        method: "PATCH",
        body: {},
      })
    ).status,
    400,
  );

  assert.equal(
    (
      await peticion("/salas/000000000000000000000001", {
        method: "PATCH",
        body: {},
      })
    ).status,
    404,
  );
});

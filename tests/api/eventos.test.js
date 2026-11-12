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
  fechasEvento,
  registrarCreado,
  Evento,
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
 * los encabezados necesarios para autenticar sus peticiones.
 */
async function sesionCliente() {
  const cliente = await crearUsuario({ rol: "cliente" });
  return crearSesion(cliente);
}

/**
 * Construye el cuerpo de una petición para crear un evento.
 * Permite sobrescribir los valores para probar distintos escenarios.
 */
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

// ---------------------------------------------------------------
// Autenticación y autorización
// Verifica quién puede acceder a cada operación de eventos
// ---------------------------------------------------------------

describe("Autenticación y autorización de eventos", () => {
  test("permite consultar eventos sin una sesión autenticada", async () => {
    const response = await peticion("/eventos");
    const eventos = await respuestaJSON(response);

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(eventos));
  });

  test("rechaza crear eventos sin una sesión autenticada", async () => {
    const response = await peticion("/eventos", {
      method: "POST",
    });

    assert.equal(response.status, 401);
  });

  test("rechaza actualizar eventos sin una sesión autenticada", async () => {
    const response = await peticion("/eventos/000000000000000000000001", {
      method: "PATCH",
    });

    assert.equal(response.status, 401);
  });

  test("rechaza crear eventos cuando el usuario autenticado no es administrador", async () => {
    const headers = await sesionCliente();

    const response = await peticion("/eventos", {
      method: "POST",
      headers,
    });

    assert.equal(response.status, 403);
  });

  test("rechaza actualizar eventos cuando el usuario autenticado no es administrador", async () => {
    const headers = await sesionCliente();

    const response = await peticion("/eventos/000000000000000000000001", {
      method: "PATCH",
      headers,
    });

    assert.equal(response.status, 403);
  });
});

// ---------------------------------------------------------------
// GET /eventos
// Consultas y recuperación de eventos
// ---------------------------------------------------------------

describe("GET /eventos", () => {
  test("devuelve un array de eventos, un evento por ID y los próximos eventos", async () => {
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

  test("excluye de próximos eventos aquellos cuya fecha de inicio ya pasó", async () => {
    const headers = await sesionCliente();
    const sala = await crearSala();
    const usuario = await crearUsuario();

    const ahora = Date.now();
    const fechaInicio = new Date(ahora - 10 * 86400000);
    const fechaFin = new Date(fechaInicio.getTime() + 3 * 60 * 60 * 1000);
    const fechaInicioVenta = new Date(fechaInicio.getTime() - 10 * 86400000);
    const fechaFinVenta = new Date(fechaInicio.getTime() - 86400000);

    const response = await peticion("/eventos", {
      method: "POST",
      headers: await sesionAdmin(),
      body: bodyEvento({
        salaId: sala.id,
        usuarioId: usuario.id,
        overrides: {
          fechaInicio: fechaInicio.toISOString(),
          fechaFin: fechaFin.toISOString(),
          fechaInicioVenta: fechaInicioVenta.toISOString(),
          fechaFinVenta: fechaFinVenta.toISOString(),
        },
      }),
    });

    const body = await respuestaJSON(response);

    assert.equal(response.status, 201);

    const creado = await Evento.findById(body.id);
    registrarCreado(Evento, creado);

    const proximos = await peticion("/eventos/proximos");
    const eventos = await respuestaJSON(proximos);

    assert.equal(proximos.status, 200);
    assert.ok(!eventos.some((evento) => evento.id === body.id));
  });

  test("distingue entre un ID inválido y un evento inexistente", async () => {
    const headers = await sesionCliente();

    const invalido = await peticion("/eventos/invalido", { headers });
    const inexistente = await peticion("/eventos/000000000000000000000001", { headers });

    assert.equal(invalido.status, 400);
    assert.equal(inexistente.status, 404);
  });
});

// ---------------------------------------------------------------
// POST /eventos
// Creación y validaciones de eventos
// ---------------------------------------------------------------

describe("POST /eventos", () => {
  test("crea un evento válido y genera la reserva en el servidor", async () => {
    const headers = await sesionAdmin();
    const sala = await crearSala();
    const usuario = await crearUsuario();

    const response = await peticion("/eventos", {
      method: "POST",
      headers,
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
    registrarCreado(Evento, creado);
  });

  test("permite un precio de entrada igual a cero", async () => {
    const headers = await sesionAdmin();
    const sala = await crearSala();
    const usuario = await crearUsuario();

    const response = await peticion("/eventos", {
      method: "POST",
      headers,
      body: bodyEvento({
        salaId: sala.id,
        usuarioId: usuario.id,
        overrides: { precioEntrada: 0 },
      }),
    });

    const body = await respuestaJSON(response);

    assert.equal(response.status, 201);
    assert.equal(body.precioEntrada, 0);

    const creado = await Evento.findById(body.id);
    registrarCreado(Evento, creado);
  });

  test("rechaza la ausencia de usuarioId, una sala inexistente y un usuario inexistente", async () => {
    const headers = await sesionAdmin();
    const sala = await crearSala();
    const usuario = await crearUsuario();

    const sinUsuario = await peticion("/eventos", {
      method: "POST",
      headers,
      body: {
        ...bodyEvento({ salaId: sala.id, usuarioId: usuario.id }),
        usuarioId: undefined,
      },
    });

    const salaNoExiste = await peticion("/eventos", {
      method: "POST",
      headers,
      body: bodyEvento({
        salaId: "000000000000000000000001",
        usuarioId: usuario.id,
      }),
    });

    const usuarioNoExiste = await peticion("/eventos", {
      method: "POST",
      headers,
      body: bodyEvento({
        salaId: sala.id,
        usuarioId: "000000000000000000000001",
      }),
    });

    assert.equal(sinUsuario.status, 400);
    assert.equal(salaNoExiste.status, 404);
    assert.equal(usuarioNoExiste.status, 404);
  });

  test("rechaza campos obligatorios ausentes distintos de usuarioId", async () => {
    const headers = await sesionAdmin();
    const sala = await crearSala();
    const usuario = await crearUsuario();

    const body = bodyEvento({
      salaId: sala.id,
      usuarioId: usuario.id,
    });

    delete body.nombre;

    const response = await peticion("/eventos", {
      method: "POST",
      headers,
      body,
    });

    assert.equal(response.status, 400);
  });

  test("rechaza fechas inválidas y tipos de datos incorrectos", async () => {
    const headers = await sesionAdmin();
    const sala = await crearSala();
    const usuario = await crearUsuario();

    const fechaInvalida = await peticion("/eventos", {
      method: "POST",
      headers,
      body: bodyEvento({
        salaId: sala.id,
        usuarioId: usuario.id,
        overrides: { fechaInicio: "no-es-una-fecha" },
      }),
    });

    const precioIncorrecto = await peticion("/eventos", {
      method: "POST",
      headers,
      body: bodyEvento({
        salaId: sala.id,
        usuarioId: usuario.id,
        overrides: { precioEntrada: "2500" },
      }),
    });

    assert.equal(fechaInvalida.status, 400);
    assert.equal(precioIncorrecto.status, 400);
  });

  test("rechaza precios negativos y fechas incoherentes", async () => {
    const headers = await sesionAdmin();
    const sala = await crearSala();
    const usuario = await crearUsuario();

    const negativo = await peticion("/eventos", {
      method: "POST",
      headers,
      body: bodyEvento({
        salaId: sala.id,
        usuarioId: usuario.id,
        overrides: { precioEntrada: -1 },
      }),
    });

    const fechas = fechasEvento();
    fechas.fechaFin = new Date(new Date(fechas.fechaInicio).getTime() - 86400000).toISOString();

    const incoherente = await peticion("/eventos", {
      method: "POST",
      headers,
      body: bodyEvento({
        salaId: sala.id,
        usuarioId: usuario.id,
        overrides: fechas,
      }),
    });

    assert.equal(negativo.status, 400);
    assert.equal(incoherente.status, 400);
  });

  test("rechaza una sala inactiva", async () => {
    const headers = await sesionAdmin();
    const sala = await crearSala({ estado: "inactiva" });
    const usuario = await crearUsuario();

    const response = await peticion("/eventos", {
      method: "POST",
      headers,
      body: bodyEvento({ salaId: sala.id, usuarioId: usuario.id }),
    });

    assert.equal(response.status, 409);
  });

  test("rechaza un usuario inactivo", async () => {
    const headers = await sesionAdmin();
    const sala = await crearSala();
    const usuario = await crearUsuario({ estado: "inactivo" });

    const response = await peticion("/eventos", {
      method: "POST",
      headers,
      body: bodyEvento({ salaId: sala.id, usuarioId: usuario.id }),
    });

    assert.equal(response.status, 409);
  });
});

// ---------------------------------------------------------------
// POST /eventos
// Reglas de negocio sobre fechas, salas y duplicados
// ---------------------------------------------------------------

describe("POST /eventos - reglas de negocio", () => {
  test("rechaza un evento duplicado en la misma sala y fecha", async () => {
    const headers = await sesionAdmin();
    const sala = await crearSala();
    const usuario = await crearUsuario();
    const existente = await crearEvento({ sala, usuario });

    const response = await peticion("/eventos", {
      method: "POST",
      headers,
      body: bodyEvento({
        salaId: sala.id,
        usuarioId: usuario.id,
        overrides: {
          nombre: existente.nombre,
          fechaInicio: existente.fechaInicio.toISOString(),
          fechaFin: existente.fechaFin.toISOString(),
          fechaInicioVenta: existente.fechaInicioVenta.toISOString(),
          fechaFinVenta: existente.fechaFinVenta.toISOString(),
        },
      }),
    });

    assert.equal(response.status, 409);
  });

  test("permite el mismo nombre y sala en otra fecha sin solapamiento", async () => {
    const headers = await sesionAdmin();
    const sala = await crearSala();
    const usuario = await crearUsuario();
    const existente = await crearEvento({ sala, usuario, dias: 30 });

    const desplazamiento = 2 * 86400000;

    const response = await peticion("/eventos", {
      method: "POST",
      headers,
      body: bodyEvento({
        salaId: sala.id,
        usuarioId: usuario.id,
        overrides: {
          nombre: existente.nombre,
          fechaInicio: new Date(existente.fechaInicio.getTime() + desplazamiento).toISOString(),
          fechaFin: new Date(existente.fechaFin.getTime() + desplazamiento).toISOString(),
          fechaInicioVenta: existente.fechaInicioVenta.toISOString(),
          fechaFinVenta: existente.fechaFinVenta.toISOString(),
        },
      }),
    });

    const body = await respuestaJSON(response);

    assert.equal(response.status, 201);
    assert.equal(body.nombre, existente.nombre);
    assert.equal(body.salaId, sala.id);

    const creado = await Evento.findById(body.id);
    registrarCreado(Evento, creado);
  });

  test("rechaza un rango superpuesto en la misma sala", async () => {
    const headers = await sesionAdmin();
    const sala = await crearSala();
    const usuario = await crearUsuario();
    const existente = await crearEvento({ sala, usuario, dias: 45 });

    const fechaInicio = new Date(existente.fechaInicio.getTime() + 60 * 60 * 1000).toISOString();

    const fechaFin = new Date(existente.fechaFin.getTime() + 60 * 60 * 1000).toISOString();

    const response = await peticion("/eventos", {
      method: "POST",
      headers,
      body: bodyEvento({
        salaId: sala.id,
        usuarioId: usuario.id,
        overrides: { fechaInicio, fechaFin },
      }),
    });

    assert.equal(response.status, 409);
  });

  test("permite eventos consecutivos en una misma sala", async () => {
    const headers = await sesionAdmin();
    const sala = await crearSala();
    const usuario = await crearUsuario();
    const existente = await crearEvento({ sala, usuario, dias: 45 });

    const fechaInicio = existente.fechaFin;
    const fechaFin = new Date(fechaInicio.getTime() + 3 * 60 * 60 * 1000);

    const response = await peticion("/eventos", {
      method: "POST",
      headers,
      body: bodyEvento({
        salaId: sala.id,
        usuarioId: usuario.id,
        overrides: {
          fechaInicio: fechaInicio.toISOString(),
          fechaFin: fechaFin.toISOString(),
          fechaInicioVenta: existente.fechaInicioVenta.toISOString(),
          fechaFinVenta: existente.fechaFinVenta.toISOString(),
        },
      }),
    });

    const body = await respuestaJSON(response);

    assert.equal(response.status, 201);
    assert.equal(body.fechaInicio, fechaInicio.toISOString());

    const creado = await Evento.findById(body.id);
    registrarCreado(Evento, creado);
  });

  test("permite eventos superpuestos en salas diferentes", async () => {
    const headers = await sesionAdmin();
    const salaExistente = await crearSala();
    const otraSala = await crearSala();
    const usuario = await crearUsuario();

    const existente = await crearEvento({
      sala: salaExistente,
      usuario,
      dias: 45,
    });

    const response = await peticion("/eventos", {
      method: "POST",
      headers,
      body: bodyEvento({
        salaId: otraSala.id,
        usuarioId: usuario.id,
        overrides: {
          fechaInicio: existente.fechaInicio.toISOString(),
          fechaFin: existente.fechaFin.toISOString(),
        },
      }),
    });

    const body = await respuestaJSON(response);

    assert.equal(response.status, 201);
    assert.equal(body.salaId, otraSala.id);

    const creado = await Evento.findById(body.id);
    registrarCreado(Evento, creado);
  });
});

// ---------------------------------------------------------------
// PATCH /eventos/:id
// Actualización y protección de campos
// ---------------------------------------------------------------

describe("PATCH /eventos/:id - actualización", () => {
  test("permite actualizar un solo campo y protege los datos de la reserva", async () => {
    const headers = await sesionAdmin();
    const evento = await crearEvento();

    const response = await peticion(`/eventos/${evento.id}`, {
      method: "PATCH",
      headers,
      body: {
        descripcion: "Descripción actualizada",
        reserva: { precioFinal: 1 },
      },
    });

    const body = await respuestaJSON(response);

    assert.equal(response.status, 200);
    assert.equal(body.descripcion, "Descripción actualizada");
    assert.equal(body.reserva.precioFinal, evento.reserva.precioFinal);
  });

  test("ignora campos desconocidos y protegidos", async () => {
    const headers = await sesionAdmin();
    const evento = await crearEvento();

    const response = await peticion(`/eventos/${evento.id}`, {
      method: "PATCH",
      headers,
      body: {
        reserva: { precioFinal: 1 },
        usuarioId: "507f1f77bcf86cd799439011",
        campoDesconocido: "valor",
      },
    });

    const body = await respuestaJSON(response);

    assert.equal(response.status, 200);
    assert.equal(body.reserva.precioFinal, evento.reserva.precioFinal);
    assert.equal(body.reserva.usuarioId, evento.reserva.usuarioId.toString());
    assert.equal(body.campoDesconocido, undefined);
    assert.equal(body.usuarioId, undefined);
  });

  test("rechaza estados inválidos, precios negativos y fechas incoherentes", async () => {
    const headers = await sesionAdmin();
    const evento = await crearEvento();

    const estado = await peticion(`/eventos/${evento.id}`, {
      method: "PATCH",
      headers,
      body: { estado: "otro" },
    });

    const precio = await peticion(`/eventos/${evento.id}`, {
      method: "PATCH",
      headers,
      body: { precioEntrada: -1 },
    });

    const fecha = await peticion(`/eventos/${evento.id}`, {
      method: "PATCH",
      headers,
      body: { fechaFin: "2020-01-01" },
    });

    assert.equal(estado.status, 400);
    assert.equal(precio.status, 400);
    assert.equal(fecha.status, 400);
  });

  test("rechaza modificar fechaInicio si contradice fechaFinVenta existente", async () => {
    const headers = await sesionAdmin();
    const evento = await crearEvento();

    const fechaInicioInvalida = new Date(
      (evento.fechaInicioVenta.getTime() + evento.fechaFinVenta.getTime()) / 2,
    );

    const response = await peticion(`/eventos/${evento.id}`, {
      method: "PATCH",
      headers,
      body: {
        fechaInicio: fechaInicioInvalida.toISOString(),
      },
    });

    assert.equal(response.status, 400);
  });

  test("rechaza modificar fechaFinVenta si queda antes de fechaInicioVenta", async () => {
    const headers = await sesionAdmin();
    const evento = await crearEvento();

    const fechaFinVentaInvalida = new Date(evento.fechaInicioVenta.getTime() - 1000);

    const response = await peticion(`/eventos/${evento.id}`, {
      method: "PATCH",
      headers,
      body: {
        fechaFinVenta: fechaFinVentaInvalida.toISOString(),
      },
    });

    assert.equal(response.status, 400);
  });

  test("distingue entre un ID inválido y un evento inexistente", async () => {
    const headers = await sesionAdmin();

    const invalido = await peticion("/eventos/invalido", {
      method: "PATCH",
      headers,
      body: {},
    });

    const inexistente = await peticion("/eventos/000000000000000000000001", {
      method: "PATCH",
      headers,
      body: {},
    });

    assert.equal(invalido.status, 400);
    assert.equal(inexistente.status, 404);
  });

  test("rechaza asignar el evento a una sala inexistente", async () => {
    const headers = await sesionAdmin();
    const evento = await crearEvento();

    const response = await peticion(`/eventos/${evento.id}`, {
      method: "PATCH",
      headers,
      body: { salaId: "000000000000000000000001" },
    });

    assert.equal(response.status, 404);
  });

  test("rechaza asignar el evento a una sala inactiva", async () => {
    const headers = await sesionAdmin();
    const evento = await crearEvento();
    const salaInactiva = await crearSala({ estado: "inactiva" });

    const response = await peticion(`/eventos/${evento.id}`, {
      method: "PATCH",
      headers,
      body: { salaId: salaInactiva.id },
    });

    assert.equal(response.status, 409);
  });

  test("rechaza modificar un evento cuya sala está inactiva", async () => {
    const headers = await sesionAdmin();
    const sala = await crearSala({ estado: "inactiva" });
    const usuario = await crearUsuario();
    const evento = await crearEvento({ sala, usuario });

    const response = await peticion(`/eventos/${evento.id}`, {
      method: "PATCH",
      headers,
      body: { descripcion: "Intento de modificación" },
    });

    assert.equal(response.status, 409);
  });
});

// ---------------------------------------------------------------
// PATCH /eventos/:id
// Reglas de negocio sobre duplicados y solapamientos
// ---------------------------------------------------------------

describe("PATCH /eventos/:id - reglas de negocio", () => {
  test("rechaza una actualización que genera un duplicado", async () => {
    const headers = await sesionAdmin();
    const sala = await crearSala();
    const usuario = await crearUsuario();

    const existente = await crearEvento({ sala, usuario, dias: 30 });
    const eventoAActualizar = await crearEvento({
      sala,
      usuario,
      dias: 60,
    });

    const nuevaFechaInicio = existente.fechaInicio.toISOString();
    const nuevaFechaFinVenta = new Date(existente.fechaInicio.getTime() - 86400000).toISOString();

    const response = await peticion(`/eventos/${eventoAActualizar.id}`, {
      method: "PATCH",
      headers,
      body: {
        nombre: existente.nombre,
        fechaInicio: nuevaFechaInicio,
        fechaFinVenta: nuevaFechaFinVenta,
      },
    });

    assert.equal(response.status, 409);
  });

  test("rechaza una actualización que genera un solapamiento", async () => {
    const headers = await sesionAdmin();
    const sala = await crearSala();
    const usuario = await crearUsuario();

    const existente = await crearEvento({ sala, usuario, dias: 45 });
    const eventoAActualizar = await crearEvento({
      sala,
      usuario,
      dias: 60,
    });

    const nuevaFechaInicio = new Date(existente.fechaInicio.getTime() + 60 * 60 * 1000);

    const nuevaFechaFin = new Date(existente.fechaFin.getTime() + 60 * 60 * 1000);

    const nuevaFechaFinVenta = new Date(nuevaFechaInicio.getTime() - 86400000);

    const response = await peticion(`/eventos/${eventoAActualizar.id}`, {
      method: "PATCH",
      headers,
      body: {
        fechaInicio: nuevaFechaInicio.toISOString(),
        fechaFin: nuevaFechaFin.toISOString(),
        fechaFinVenta: nuevaFechaFinVenta.toISOString(),
      },
    });

    assert.equal(response.status, 409);
  });

  test("rechaza cambiar de sala cuando genera un solapamiento", async () => {
    const headers = await sesionAdmin();
    const salaDestino = await crearSala();
    const otraSala = await crearSala();
    const usuario = await crearUsuario();

    await crearEvento({
      sala: salaDestino,
      usuario,
      dias: 45,
    });

    const eventoAActualizar = await crearEvento({
      sala: otraSala,
      usuario,
      dias: 45,
    });

    const response = await peticion(`/eventos/${eventoAActualizar.id}`, {
      method: "PATCH",
      headers,
      body: {
        salaId: salaDestino.id,
      },
    });

    assert.equal(response.status, 409);
  });

  test("permite modificar fechas sin generar duplicados ni solapamientos", async () => {
    const headers = await sesionAdmin();
    const evento = await crearEvento();

    const desplazamiento = 2 * 86400000;

    const fechaInicio = new Date(evento.fechaInicio.getTime() + desplazamiento);
    const fechaFin = new Date(evento.fechaFin.getTime() + desplazamiento);
    const fechaFinVenta = new Date(evento.fechaFinVenta.getTime() + desplazamiento);

    const response = await peticion(`/eventos/${evento.id}`, {
      method: "PATCH",
      headers,
      body: {
        fechaInicio: fechaInicio.toISOString(),
        fechaFin: fechaFin.toISOString(),
        fechaFinVenta: fechaFinVenta.toISOString(),
      },
    });

    const body = await respuestaJSON(response);

    assert.equal(response.status, 200);
    assert.equal(body.fechaInicio, fechaInicio.toISOString());
    assert.equal(body.fechaFin, fechaFin.toISOString());
    assert.equal(body.fechaFinVenta, fechaFinVenta.toISOString());
  });
});

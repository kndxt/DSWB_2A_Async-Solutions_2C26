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
  registrarCreado,
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

test("GET /eventos/proximos excluye eventos cuya fecha de inicio ya pasó", async () => {
  const sala = await crearSala();
  const usuario = await crearUsuario();

  const ahora = Date.now();
  const fechaInicio = new Date(ahora - 10 * 86400000);
  const fechaFin = new Date(fechaInicio.getTime() + 3 * 60 * 60 * 1000);
  const fechaInicioVenta = new Date(fechaInicio.getTime() - 10 * 86400000);
  const fechaFinVenta = new Date(fechaInicio.getTime() - 86400000);

  const response = await peticion("/eventos", {
    method: "POST",
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
  registrarCreado(Evento, creado);
});

test("POST /eventos permite precio de entrada igual a cero", async () => {
  const sala = await crearSala();
  const usuario = await crearUsuario();

  const response = await peticion("/eventos", {
    method: "POST",
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

test("POST /eventos rechaza ausencia de usuario, sala inexistente y usuario inexistente", async () => {
  const sala = await crearSala();
  const usuario = await crearUsuario();

  const sinUsuario = await peticion("/eventos", {
    method: "POST",
    body: {
      ...bodyEvento({ salaId: sala.id, usuarioId: usuario.id }),
      usuarioId: undefined,
    },
  });

  const salaNoExiste = await peticion("/eventos", {
    method: "POST",
    body: bodyEvento({
      salaId: "000000000000000000000001",
      usuarioId: usuario.id,
    }),
  });

  const usuarioNoExiste = await peticion("/eventos", {
    method: "POST",
    body: bodyEvento({
      salaId: sala.id,
      usuarioId: "000000000000000000000001",
    }),
  });

  assert.equal(sinUsuario.status, 400);
  assert.equal(salaNoExiste.status, 404);
  assert.equal(usuarioNoExiste.status, 404);
});

test("POST /eventos rechaza campos obligatorios ausentes distintos de usuarioId", async () => {
  const sala = await crearSala();
  const usuario = await crearUsuario();

  const body = bodyEvento({
    salaId: sala.id,
    usuarioId: usuario.id,
  });

  delete body.nombre;

  const response = await peticion("/eventos", {
    method: "POST",
    body,
  });

  assert.equal(response.status, 400);
});

test("POST /eventos rechaza fechas inválidas y tipos incorrectos", async () => {
  const sala = await crearSala();
  const usuario = await crearUsuario();

  const fechaInvalida = await peticion("/eventos", {
    method: "POST",
    body: bodyEvento({
      salaId: sala.id,
      usuarioId: usuario.id,
      overrides: { fechaInicio: "no-es-una-fecha" },
    }),
  });

  const precioIncorrecto = await peticion("/eventos", {
    method: "POST",
    body: bodyEvento({
      salaId: sala.id,
      usuarioId: usuario.id,
      overrides: { precioEntrada: "2500" },
    }),
  });

  assert.equal(fechaInvalida.status, 400);
  assert.equal(precioIncorrecto.status, 400);
});

test("POST /eventos rechaza precio negativo y fechas incoherentes", async () => {
  const sala = await crearSala();
  const usuario = await crearUsuario();

  const negativo = await peticion("/eventos", {
    method: "POST",
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
    body: bodyEvento({
      salaId: sala.id,
      usuarioId: usuario.id,
      overrides: fechas,
    }),
  });

  assert.equal(negativo.status, 400);
  assert.equal(incoherente.status, 400);
});

test("POST /eventos rechaza una sala inactiva", async () => {
  const sala = await crearSala({ estado: "inactiva" });
  const usuario = await crearUsuario();

  const response = await peticion("/eventos", {
    method: "POST",
    body: bodyEvento({ salaId: sala.id, usuarioId: usuario.id }),
  });

  assert.equal(response.status, 409);
});

test("POST /eventos rechaza un usuario inactivo", async () => {
  const sala = await crearSala();
  const usuario = await crearUsuario({ estado: "inactivo" });

  const response = await peticion("/eventos", {
    method: "POST",
    body: bodyEvento({ salaId: sala.id, usuarioId: usuario.id }),
  });

  assert.equal(response.status, 409);
});

test("POST /eventos rechaza un evento duplicado en la misma sala y fecha", async () => {
  const sala = await crearSala();
  const usuario = await crearUsuario();
  const existente = await crearEvento({ sala, usuario });

  const response = await peticion("/eventos", {
    method: "POST",
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

test("POST /eventos permite el mismo nombre y sala en otra fecha sin solapamiento", async () => {
  const sala = await crearSala();
  const usuario = await crearUsuario();
  const existente = await crearEvento({ sala, usuario, dias: 30 });

  const desplazamiento = 2 * 86400000;

  const response = await peticion("/eventos", {
    method: "POST",
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

test("POST /eventos rechaza un rango superpuesto en la misma sala", async () => {
  const sala = await crearSala();
  const usuario = await crearUsuario();
  const existente = await crearEvento({ sala, usuario, dias: 45 });

  const fechaInicio = new Date(existente.fechaInicio.getTime() + 60 * 60 * 1000).toISOString();

  const fechaFin = new Date(existente.fechaFin.getTime() + 60 * 60 * 1000).toISOString();

  const response = await peticion("/eventos", {
    method: "POST",
    body: bodyEvento({
      salaId: sala.id,
      usuarioId: usuario.id,
      overrides: { fechaInicio, fechaFin },
    }),
  });

  assert.equal(response.status, 409);
});

test("POST /eventos permite eventos consecutivos en una misma sala", async () => {
  const sala = await crearSala();
  const usuario = await crearUsuario();
  const existente = await crearEvento({ sala, usuario, dias: 45 });

  const fechaInicio = existente.fechaFin;
  const fechaFin = new Date(fechaInicio.getTime() + 3 * 60 * 60 * 1000);

  const response = await peticion("/eventos", {
    method: "POST",
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

test("POST /eventos permite eventos superpuestos en salas diferentes", async () => {
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

test("PATCH /eventos/:id permite actualizar un solo campo y protege la reserva", async () => {
  const evento = await crearEvento();

  const response = await peticion(`/eventos/${evento.id}`, {
    method: "PATCH",
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

test("PATCH /eventos/:id ignora campos desconocidos y protegidos", async () => {
  const evento = await crearEvento();

  const response = await peticion(`/eventos/${evento.id}`, {
    method: "PATCH",
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

test("PATCH /eventos/:id rechaza estado inválido, precio negativo y fechas incoherentes", async () => {
  const evento = await crearEvento();

  const estado = await peticion(`/eventos/${evento.id}`, {
    method: "PATCH",
    body: { estado: "otro" },
  });

  const precio = await peticion(`/eventos/${evento.id}`, {
    method: "PATCH",
    body: { precioEntrada: -1 },
  });

  const fecha = await peticion(`/eventos/${evento.id}`, {
    method: "PATCH",
    body: { fechaFin: "2020-01-01" },
  });

  assert.equal(estado.status, 400);
  assert.equal(precio.status, 400);
  assert.equal(fecha.status, 400);
});

test("PATCH /eventos/:id rechaza modificar fechaInicio si contradice fechaFinVenta existente", async () => {
  const evento = await crearEvento();

  const fechaInicioInvalida = new Date(
    (evento.fechaInicioVenta.getTime() + evento.fechaFinVenta.getTime()) / 2,
  );

  const response = await peticion(`/eventos/${evento.id}`, {
    method: "PATCH",
    body: {
      fechaInicio: fechaInicioInvalida.toISOString(),
    },
  });

  assert.equal(response.status, 400);
});

test("PATCH /eventos/:id rechaza modificar fechaFinVenta si queda antes de fechaInicioVenta", async () => {
  const evento = await crearEvento();

  const fechaFinVentaInvalida = new Date(evento.fechaInicioVenta.getTime() - 1000);

  const response = await peticion(`/eventos/${evento.id}`, {
    method: "PATCH",
    body: {
      fechaFinVenta: fechaFinVentaInvalida.toISOString(),
    },
  });

  assert.equal(response.status, 400);
});

test("PATCH /eventos/:id distingue ID inválido y evento inexistente", async () => {
  assert.equal(
    (
      await peticion("/eventos/invalido", {
        method: "PATCH",
        body: {},
      })
    ).status,
    400,
  );

  assert.equal(
    (
      await peticion("/eventos/000000000000000000000001", {
        method: "PATCH",
        body: {},
      })
    ).status,
    404,
  );
});

test("PATCH /eventos/:id rechaza asignar el evento a una sala inexistente", async () => {
  const evento = await crearEvento();

  const response = await peticion(`/eventos/${evento.id}`, {
    method: "PATCH",
    body: { salaId: "000000000000000000000001" },
  });

  assert.equal(response.status, 404);
});

test("PATCH /eventos/:id rechaza asignar el evento a una sala inactiva", async () => {
  const evento = await crearEvento();
  const salaInactiva = await crearSala({ estado: "inactiva" });

  const response = await peticion(`/eventos/${evento.id}`, {
    method: "PATCH",
    body: { salaId: salaInactiva.id },
  });

  assert.equal(response.status, 409);
});

test("PATCH /eventos/:id rechaza modificar un evento cuya sala está inactiva", async () => {
  const sala = await crearSala({ estado: "inactiva" });
  const usuario = await crearUsuario();
  const evento = await crearEvento({ sala, usuario });

  const response = await peticion(`/eventos/${evento.id}`, {
    method: "PATCH",
    body: { descripcion: "Intento de modificación" },
  });

  assert.equal(response.status, 409);
});

test("PATCH /eventos/:id rechaza una actualización que genera un duplicado", async () => {
  const sala = await crearSala();
  const usuario = await crearUsuario();

  const existente = await crearEvento({ sala, usuario, dias: 30 });
  const eventoAActualizar = await crearEvento({ sala, usuario, dias: 60 });

  const nuevaFechaInicio = existente.fechaInicio.toISOString();
  const nuevaFechaFinVenta = new Date(existente.fechaInicio.getTime() - 86400000).toISOString();

  const response = await peticion(`/eventos/${eventoAActualizar.id}`, {
    method: "PATCH",
    body: {
      nombre: existente.nombre,
      fechaInicio: nuevaFechaInicio,
      fechaFinVenta: nuevaFechaFinVenta,
    },
  });

  assert.equal(response.status, 409);
});

test("PATCH /eventos/:id rechaza una actualización que genera un solapamiento", async () => {
  const sala = await crearSala();
  const usuario = await crearUsuario();

  const existente = await crearEvento({ sala, usuario, dias: 45 });
  const eventoAActualizar = await crearEvento({ sala, usuario, dias: 60 });

  const nuevaFechaInicio = new Date(existente.fechaInicio.getTime() + 60 * 60 * 1000);

  const nuevaFechaFin = new Date(existente.fechaFin.getTime() + 60 * 60 * 1000);

  const nuevaFechaFinVenta = new Date(nuevaFechaInicio.getTime() - 86400000);

  const response = await peticion(`/eventos/${eventoAActualizar.id}`, {
    method: "PATCH",
    body: {
      fechaInicio: nuevaFechaInicio.toISOString(),
      fechaFin: nuevaFechaFin.toISOString(),
      fechaFinVenta: nuevaFechaFinVenta.toISOString(),
    },
  });

  assert.equal(response.status, 409);
});

test("PATCH /eventos/:id rechaza cambiar de sala cuando genera un solapamiento", async () => {
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
    body: {
      salaId: salaDestino.id,
    },
  });

  assert.equal(response.status, 409);
});

test("PATCH /eventos/:id permite modificar fechas sin generar duplicados ni solapamientos", async () => {
  const evento = await crearEvento();

  const desplazamiento = 2 * 86400000;

  const fechaInicio = new Date(evento.fechaInicio.getTime() + desplazamiento);
  const fechaFin = new Date(evento.fechaFin.getTime() + desplazamiento);
  const fechaFinVenta = new Date(evento.fechaFinVenta.getTime() + desplazamiento);

  const response = await peticion(`/eventos/${evento.id}`, {
    method: "PATCH",
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

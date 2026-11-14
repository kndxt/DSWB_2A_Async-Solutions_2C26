import test, { before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  iniciarEntorno,
  cerrarEntorno,
  conectarCliente,
  cerrarClientes,
  esperarEvento,
  esperarHasta,
  crearUsuario,
  crearSesion,
} from "../helpers/environment.js";
import { obtenerIO } from "../../sockets/index.js";
import { EVENTOS, TIPOS } from "../../sockets/eventos.js";
import { AsistenteError } from "../../services/aiService.js";

// RESPUESTAS SIMULADAS

const RESPUESTA_SIMULADA = (consulta) => `Respuesta simulada: ${consulta}`;

// Servicio de IA reemplazable para probar distintos escenarios sin
// realizar llamadas reales a Gemini.
let consultarIA = async (consulta) => RESPUESTA_SIMULADA(consulta);

// ENTORNO DE PRUEBAS

before(() =>
  iniciarEntorno({
    sockets: true,
    opcionesChat: {
      consultarIA: (consulta) => consultarIA(consulta),
    },
  }),
);

after(cerrarEntorno);

// Cada prueba comienza sin conexiones abiertas y con el servicio de IA
// restablecido a su comportamiento simulado por defecto.
afterEach(async () => {
  cerrarClientes();

  await esperarHasta(() => obtenerIO().sockets.sockets.size === 0);

  consultarIA = async (consulta) => RESPUESTA_SIMULADA(consulta);
});

// HELPERS

// Crea un usuario real y establece una conexión autenticada.
const crearClienteAutenticado = async () => {
  const usuario = await crearUsuario();

  const cliente = await conectarCliente({
    extraHeaders: crearSesion(usuario),
  });

  return { cliente, usuario };
};

// Registra los mensajes recibidos y permite detener la escucha
// cuando la prueba ya no necesita recopilar eventos.
const escucharMensajes = (cliente) => {
  const mensajes = [];
  const listener = (mensaje) => mensajes.push(mensaje);

  cliente.on(EVENTOS.MENSAJE, listener);

  return {
    mensajes,
    detener: () => cliente.off(EVENTOS.MENSAJE, listener),
  };
};

// MENSAJES DIRIGIDOS A GEMINI

test("una mención válida a Gemini difunde la respuesta del asistente", async () => {
  const primero = await crearClienteAutenticado();
  const segundo = await crearClienteAutenticado();

  // Ambos clientes deben recibir el mensaje original y la respuesta.
  const escuchaPrimero = escucharMensajes(primero.cliente);
  const escuchaSegundo = escucharMensajes(segundo.cliente);

  primero.cliente.emit(EVENTOS.MENSAJE, {
    texto: "@gemini ¿Qué es una API?",
  });

  await esperarHasta(
    () =>
      escuchaPrimero.mensajes.some((mensaje) => mensaje.tipo === TIPOS.ASISTENTE) &&
      escuchaSegundo.mensajes.some((mensaje) => mensaje.tipo === TIPOS.ASISTENTE),
  );

  for (const { mensajes } of [escuchaPrimero, escuchaSegundo]) {
    // Se filtran los mensajes de sistema porque las conexiones
    // también generan anuncios de entrada al chat.
    const mensajesUsuario = mensajes.filter((mensaje) => mensaje.tipo === TIPOS.USUARIO);

    const mensajesAsistente = mensajes.filter((mensaje) => mensaje.tipo === TIPOS.ASISTENTE);

    assert.equal(mensajesUsuario.length, 1);
    assert.equal(mensajesUsuario[0].texto, "@gemini ¿Qué es una API?");

    assert.equal(mensajesAsistente.length, 1);
    assert.deepEqual(mensajesAsistente[0].autor, {
      id: null,
      nombre: "Gemini",
    });

    assert.equal(mensajesAsistente[0].texto, "Respuesta simulada: ¿Qué es una API?");

    // La respuesta del asistente debe llegar después del mensaje original.
    const indiceUsuario = mensajes.findIndex((mensaje) => mensaje.tipo === TIPOS.USUARIO);

    const indiceAsistente = mensajes.findIndex((mensaje) => mensaje.tipo === TIPOS.ASISTENTE);

    assert.ok(indiceAsistente > indiceUsuario);
  }

  escuchaPrimero.detener();
  escuchaSegundo.detener();
});

test("un mensaje sin mención a Gemini no invoca el servicio de IA", async () => {
  let consultasRealizadas = 0;

  consultarIA = async () => {
    consultasRealizadas += 1;
    return "Respuesta inesperada";
  };

  const { cliente } = await crearClienteAutenticado();
  const recepcion = esperarEvento(cliente, EVENTOS.MENSAJE);

  cliente.emit(EVENTOS.MENSAJE, {
    texto: "Hola, ¿cómo están?",
  });

  const mensaje = await recepcion;

  assert.equal(mensaje.tipo, TIPOS.USUARIO);
  assert.equal(mensaje.texto, "Hola, ¿cómo están?");
  assert.equal(consultasRealizadas, 0);
});

test("un error controlado de Gemini difunde un mensaje genérico", async () => {
  consultarIA = async () => {
    throw new AsistenteError("timeout");
  };

  const { cliente } = await crearClienteAutenticado();
  const escucha = escucharMensajes(cliente);

  cliente.emit(EVENTOS.MENSAJE, {
    texto: "@gemini explicame las API",
  });

  await esperarHasta(() => escucha.mensajes.some((mensaje) => mensaje.tipo === TIPOS.ASISTENTE));

  const respuesta = escucha.mensajes.find((mensaje) => mensaje.tipo === TIPOS.ASISTENTE);

  assert.equal(
    respuesta.texto,
    "Gemini no está disponible en este momento. Intentá nuevamente más tarde.",
  );

  escucha.detener();
});

// CONTROL DE FRECUENCIA

test("el cooldown rechaza una segunda consulta del mismo usuario", async () => {
  let consultasRealizadas = 0;

  consultarIA = async () => {
    consultasRealizadas += 1;
    return "Respuesta simulada";
  };

  const { cliente } = await crearClienteAutenticado();

  cliente.emit(EVENTOS.MENSAJE, {
    texto: "@gemini primera consulta",
  });

  await esperarHasta(() => consultasRealizadas === 1);

  const error = esperarEvento(cliente, EVENTOS.ERROR);

  cliente.emit(EVENTOS.MENSAJE, {
    texto: "@gemini segunda consulta",
  });

  assert.deepEqual(await error, {
    mensaje: "Esperá unos segundos antes de volver a consultar a Gemini.",
  });

  // La segunda consulta no debe llegar al servicio de IA.
  assert.equal(consultasRealizadas, 1);
});

test("el cooldown se comparte entre las conexiones del mismo usuario", async () => {
  let consultasRealizadas = 0;

  consultarIA = async () => {
    consultasRealizadas += 1;
    return "Respuesta simulada";
  };

  const usuario = await crearUsuario();
  const opciones = {
    extraHeaders: crearSesion(usuario),
  };

  // Las dos conexiones pertenecen a la misma cuenta.
  const primero = await conectarCliente(opciones);
  const segundo = await conectarCliente(opciones);

  primero.emit(EVENTOS.MENSAJE, {
    texto: "@gemini primera consulta",
  });

  await esperarHasta(() => consultasRealizadas === 1);

  const error = esperarEvento(segundo, EVENTOS.ERROR);

  segundo.emit(EVENTOS.MENSAJE, {
    texto: "@gemini segunda consulta",
  });

  assert.deepEqual(await error, {
    mensaje: "Esperá unos segundos antes de volver a consultar a Gemini.",
  });

  assert.equal(consultasRealizadas, 1);
});

// MANEJO DE ERRORES

test("el chat continúa funcionando después de un error de Gemini", async () => {
  consultarIA = async () => {
    throw new AsistenteError("timeout");
  };

  const { cliente } = await crearClienteAutenticado();
  const escucha = escucharMensajes(cliente);

  cliente.emit(EVENTOS.MENSAJE, {
    texto: "@gemini primera consulta",
  });

  await esperarHasta(() => escucha.mensajes.some((mensaje) => mensaje.tipo === TIPOS.ASISTENTE));

  // Un fallo de Gemini no debe impedir que se sigan enviando mensajes.
  cliente.emit(EVENTOS.MENSAJE, {
    texto: "Este mensaje debe llegar normalmente",
  });

  await esperarHasta(() =>
    escucha.mensajes.some(
      (mensaje) =>
        mensaje.tipo === TIPOS.USUARIO && mensaje.texto === "Este mensaje debe llegar normalmente",
    ),
  );

  const mensaje = escucha.mensajes.find(
    (mensaje) =>
      mensaje.tipo === TIPOS.USUARIO && mensaje.texto === "Este mensaje debe llegar normalmente",
  );

  assert.ok(mensaje);

  escucha.detener();
});

test("un error inesperado de Gemini no expone detalles técnicos", async (t) => {
  const errorInterno = new Error("Detalle interno de la API");

  consultarIA = async () => {
    throw errorInterno;
  };

  // Evita imprimir el error esperado durante la prueba.
  const registrarError = t.mock.method(console, "error", () => {});

  const { cliente } = await crearClienteAutenticado();
  const escucha = escucharMensajes(cliente);

  cliente.emit(EVENTOS.MENSAJE, {
    texto: "@gemini consulta de prueba",
  });

  await esperarHasta(() => escucha.mensajes.some((mensaje) => mensaje.tipo === TIPOS.ASISTENTE));

  const respuesta = escucha.mensajes.find((mensaje) => mensaje.tipo === TIPOS.ASISTENTE);

  assert.equal(
    respuesta.texto,
    "Gemini no está disponible en este momento. Intentá nuevamente más tarde.",
  );

  assert.equal(respuesta.texto.includes("Detalle interno de la API"), false);

  assert.equal(registrarError.mock.calls.length, 1);

  escucha.detener();
});

// EJECUCIÓN ASÍNCRONA

test("el chat procesa otros mensajes mientras Gemini está respondiendo", async () => {
  let resolverGemini;

  // La consulta queda pendiente hasta que la prueba resuelva la promesa.
  consultarIA = () =>
    new Promise((resolve) => {
      resolverGemini = resolve;
    });

  const { cliente } = await crearClienteAutenticado();
  const escucha = escucharMensajes(cliente);

  cliente.emit(EVENTOS.MENSAJE, {
    texto: "@gemini consulta pendiente",
  });

  await esperarHasta(() => typeof resolverGemini === "function");

  // Se envía otro mensaje mientras la consulta a Gemini sigue pendiente.
  cliente.emit(EVENTOS.MENSAJE, {
    texto: "Mensaje enviado mientras Gemini responde",
  });

  await esperarHasta(() =>
    escucha.mensajes.some(
      (mensaje) =>
        mensaje.tipo === TIPOS.USUARIO &&
        mensaje.texto === "Mensaje enviado mientras Gemini responde",
    ),
  );

  const mensajeUsuario = escucha.mensajes.find(
    (mensaje) =>
      mensaje.tipo === TIPOS.USUARIO &&
      mensaje.texto === "Mensaje enviado mientras Gemini responde",
  );

  assert.ok(mensajeUsuario);

  // Al resolver la consulta, el asistente debe difundir su respuesta.
  resolverGemini("Respuesta tardía de Gemini");

  await esperarHasta(() =>
    escucha.mensajes.some(
      (mensaje) =>
        mensaje.tipo === TIPOS.ASISTENTE && mensaje.texto === "Respuesta tardía de Gemini",
    ),
  );

  escucha.detener();
});

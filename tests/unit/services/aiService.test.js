import test, { mock } from "node:test";
import assert from "node:assert/strict";

import {
  crearServicioIA,
  consultarIA,
  AsistenteError,
  MAX_TOKENS_RESPUESTA,
  MAX_CARACTERES_RESPUESTA,
  MAX_CARACTERES_PREGUNTA,
} from "../../../services/aiService.js";
import { ValidationError } from "../../../errors/errores.js";

// Servicio con un cliente simulado: ninguna prueba llama a la API real.
const crearServicioDePrueba = (generateContent, opciones = {}) =>
  crearServicioIA({
    apiKey: "clave-de-prueba",
    modelo: "modelo-de-prueba",
    contexto: "Instrucciones de prueba",
    registrarError: () => {},
    crearCliente: () => ({ models: { generateContent } }),
    ...opciones,
  });

const errorHTTP = (estado, mensaje = "error") => Object.assign(new Error(mensaje), { status: estado });

// Comprueba que la promesa se rechaza con un AsistenteError del motivo indicado.
const assertMotivo = (promesa, motivo) =>
  assert.rejects(promesa, (error) => {
    assert.ok(error instanceof AsistenteError);
    assert.equal(error.motivo, motivo);
    return true;
  });

// ============================================================
// RESPUESTAS CORRECTAS
// ============================================================

test("devuelve el texto de la respuesta y envía la consulta con su configuración", async () => {
  let recibido;
  const servicio = crearServicioDePrueba(async (parametros) => {
    recibido = parametros;
    return { text: "  Hola, soy el asistente.  " };
  });

  const respuesta = await servicio.consultarIA("  ¿Qué es Urbana Cult?  ");

  assert.equal(respuesta, "Hola, soy el asistente.");
  assert.equal(recibido.model, "modelo-de-prueba");
  assert.equal(recibido.contents, "¿Qué es Urbana Cult?");
  assert.equal(recibido.config.systemInstruction, "Instrucciones de prueba");
  assert.equal(recibido.config.maxOutputTokens, MAX_TOKENS_RESPUESTA);
  assert.ok(recibido.config.abortSignal instanceof AbortSignal);
});

test("acota las respuestas demasiado largas", async () => {
  const servicio = crearServicioDePrueba(async () => ({
    text: "a".repeat(MAX_CARACTERES_RESPUESTA + 500),
  }));

  const respuesta = await servicio.consultarIA("hola");

  assert.ok(respuesta.length <= MAX_CARACTERES_RESPUESTA);
  assert.ok(respuesta.endsWith("…"));
});

test("inicializa el cliente una sola vez", async () => {
  let clientesCreados = 0;
  const servicio = crearServicioDePrueba(null, {
    crearCliente: () => {
      clientesCreados += 1;
      return { models: { generateContent: async () => ({ text: "ok" }) } };
    },
  });

  await servicio.consultarIA("uno");
  await servicio.consultarIA("dos");
  await servicio.consultarIA("tres");

  assert.equal(clientesCreados, 1);
});

test("usa por defecto el contexto de prompts/ sin datos sensibles", async () => {
  let instrucciones;
  const servicio = crearServicioIA({
    apiKey: "clave-de-prueba",
    registrarError: () => {},
    crearCliente: () => ({
      models: {
        generateContent: async ({ config }) => {
          instrucciones = config.systemInstruction;
          return { text: "ok" };
        },
      },
    }),
  });

  await servicio.consultarIA("hola");

  assert.equal(typeof instrucciones, "string");
  assert.match(instrucciones, /Urbana Cult/);
  assert.doesNotMatch(instrucciones, /JWT_SECRET|GEMINI_API_KEY|MONGODB_URI/);
});

// ============================================================
// VALIDACIÓN DE LA CONSULTA
// ============================================================

test("rechaza consultas inválidas sin llamar a la API", async () => {
  let llamadas = 0;
  const servicio = crearServicioDePrueba(async () => {
    llamadas += 1;
    return { text: "ok" };
  });

  const invalidas = ["", "   ", null, undefined, 123, "a".repeat(MAX_CARACTERES_PREGUNTA + 1)];

  for (const consulta of invalidas) {
    await assert.rejects(servicio.consultarIA(consulta), ValidationError);
  }

  assert.equal(llamadas, 0);
});

// ============================================================
// ERRORES CONTROLADOS
// ============================================================

test("clasifica los errores de la API según su causa", async () => {
  const casos = [
    [errorHTTP(429), "cuota"],
    [errorHTTP(401), "credenciales"],
    [errorHTTP(403), "credenciales"],
    [errorHTTP(400, "API key not valid. Please pass a valid API key."), "credenciales"],
    [errorHTTP(400, "Solicitud inválida"), "desconocido"],
    [errorHTTP(404), "modelo"],
    [errorHTTP(500), "servicio"],
    [errorHTTP(503), "servicio"],
    [new Error("fetch failed"), "desconocido"],
  ];

  for (const [error, motivo] of casos) {
    const servicio = crearServicioDePrueba(async () => {
      throw error;
    });

    await assertMotivo(servicio.consultarIA("hola"), motivo);
  }
});

test("el error controlado no expone detalles técnicos", async () => {
  const original = errorHTTP(500, "DETALLE_TECNICO_INTERNO");
  const servicio = crearServicioDePrueba(async () => {
    throw original;
  });

  await assert.rejects(servicio.consultarIA("hola"), (error) => {
    assert.equal(error.message, "El asistente no está disponible en este momento.");
    assert.doesNotMatch(error.message, /DETALLE_TECNICO_INTERNO/);
    assert.equal(error.statusCode, 503);
    assert.equal(error.isOperational, true);
    assert.strictEqual(error.cause, original);
    return true;
  });
});

test("registra el error en el servidor sin mostrar la clave", async () => {
  const registros = [];
  const servicio = crearServicioDePrueba(
    async () => {
      throw errorHTTP(500, "fallo con la clave clave-de-prueba incluida");
    },
    { registrarError: (mensaje) => registros.push(mensaje) },
  );

  await assertMotivo(servicio.consultarIA("hola"), "servicio");

  assert.equal(registros.length, 1);
  assert.match(registros[0], /servicio/);
  assert.doesNotMatch(registros[0], /clave-de-prueba/);
});

test("vence el plazo cuando la API responde demasiado tarde", async () => {
  let senal;
  const servicio = crearServicioDePrueba(
    ({ config }) => {
      senal = config.abortSignal;
      return new Promise((_, reject) => {
        senal.addEventListener("abort", () => reject(new Error("cancelada")));
      });
    },
    { tiempoMaximo: 20 },
  );

  await assertMotivo(servicio.consultarIA("hola"), "timeout");
  assert.equal(senal.aborted, true);
});

test("vence el plazo aunque el cliente ignore la cancelación", async () => {
  const servicio = crearServicioDePrueba(() => new Promise(() => {}), { tiempoMaximo: 20 });

  await assertMotivo(servicio.consultarIA("hola"), "timeout");
});

test("rechaza respuestas vacías y bloqueadas", async () => {
  const casos = [
    [{ text: undefined }, "vacia"],
    [{ text: "   " }, "vacia"],
    [{ text: "ok", promptFeedback: { blockReason: "SAFETY" } }, "bloqueada"],
    [{ text: undefined, candidates: [{ finishReason: "SAFETY" }] }, "bloqueada"],
  ];

  for (const [respuesta, motivo] of casos) {
    const servicio = crearServicioDePrueba(async () => respuesta);

    await assertMotivo(servicio.consultarIA("hola"), motivo);
  }
});

// ============================================================
// CONFIGURACIÓN
// ============================================================

test("falla la consulta, no la creación del servicio, cuando falta la clave", async () => {
  let clientesCreados = 0;
  const servicio = crearServicioDePrueba(null, {
    apiKey: "",
    crearCliente: () => {
      clientesCreados += 1;
    },
  });

  await assertMotivo(servicio.consultarIA("hola"), "configuracion");
  assert.equal(clientesCreados, 0);
});

test("consultarIA exportado informa la falta de configuración", async () => {
  const claveAnterior = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  mock.method(console, "error", () => {});

  try {
    await assertMotivo(consultarIA("hola"), "configuracion");
  } finally {
    mock.restoreAll();
    if (claveAnterior !== undefined) process.env.GEMINI_API_KEY = claveAnterior;
  }
});
import { readFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";
import { AppError, ValidationError } from "../errors/errores.js";

// Servicio de consultas a Gemini. No conoce el chat ni Socket.IO: recibe un
// texto y devuelve un texto, o lanza un AsistenteError controlado.

// El modelo puede cambiarse con la variable de entorno GEMINI_MODEL.
export const MODELO_POR_DEFECTO = "gemini-3.8-flash";
export const TIMEOUT_MS = 15000;
export const MAX_TOKENS_RESPUESTA = 1024;
export const MAX_CARACTERES_RESPUESTA = 1500;
export const MAX_CARACTERES_PREGUNTA = 1000;

const RUTA_CONTEXTO = new URL("../prompts/asistente.md", import.meta.url);

// Error controlado de cualquier fallo del asistente. El mensaje es genérico y
// seguro para mostrar; el motivo sirve para registrar y decidir qué publicar,
// y el error original queda en `cause`.
// Motivos: configuracion, timeout, cuota, credenciales, modelo, servicio,
// bloqueada, vacia, desconocido.
export class AsistenteError extends AppError {
  constructor(motivo, causa) {
    super("El asistente no está disponible en este momento.", 503);
    this.motivo = motivo;
    if (causa) this.cause = causa;
  }
}

// Error interno para distinguir el vencimiento del plazo de otros fallos.
class ConsultaVencida extends Error {}

const ocultarClave = (texto, clave) =>
  clave ? String(texto).split(clave).join("***") : String(texto);

// Traduce un error técnico del SDK a un motivo conocido.
const clasificarError = (error) => {
  if (error instanceof ConsultaVencida || error?.name === "AbortError") return "timeout";

  const estado = error?.status;
  if (estado === 429) return "cuota";
  if (estado === 401 || estado === 403) return "credenciales";
  if (estado === 400 && /api key/i.test(error.message ?? "")) return "credenciales";
  if (estado === 404) return "modelo";
  if (typeof estado === "number" && estado >= 500) return "servicio";

  return "desconocido";
};

const validarPregunta = (pregunta) => {
  if (typeof pregunta !== "string" || pregunta.trim() === "") {
    throw new ValidationError("La consulta no puede estar vacía.");
  }

  const texto = pregunta.trim();

  if (texto.length > MAX_CARACTERES_PREGUNTA) {
    throw new ValidationError(
      `La consulta no puede superar los ${MAX_CARACTERES_PREGUNTA} caracteres.`,
    );
  }

  return texto;
};

// Ejecuta la operación con un plazo máximo. Además de cancelar la solicitud
// con la señal, rechaza por su cuenta, por si el SDK no respeta la cancelación.
const conTimeout = (operacion, tiempoMaximo) => {
  const controlador = new AbortController();
  let temporizador;

  const vencimiento = new Promise((_, reject) => {
    temporizador = setTimeout(() => {
      controlador.abort();
      reject(new ConsultaVencida());
    }, tiempoMaximo);
  });

  return Promise.race([
    Promise.resolve().then(() => operacion(controlador.signal)),
    vencimiento,
  ]).finally(() => clearTimeout(temporizador));
};

const MOTIVOS_DE_BLOQUEO = ["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST"];

const extraerTexto = (respuesta) => {
  const texto = respuesta?.text?.trim();
  const finalizacion = respuesta?.candidates?.[0]?.finishReason;

  if (
    respuesta?.promptFeedback?.blockReason ||
    (!texto && MOTIVOS_DE_BLOQUEO.includes(finalizacion))
  ) {
    throw new AsistenteError("bloqueada");
  }

  if (!texto) {
    throw new AsistenteError("vacia");
  }

  // Se acota la respuesta para no inundar el chat.
  return texto.length > MAX_CARACTERES_RESPUESTA
    ? `${texto.slice(0, MAX_CARACTERES_RESPUESTA - 1).trimEnd()}…`
    : texto;
};

/**
 * Crea un servicio de consultas a Gemini.
 *
 * El cliente se crea una sola vez, la primera vez que se consulta. Si falta la
 * clave, crear el servicio no falla: falla la consulta, para que el resto de la
 * aplicación siga funcionando sin el asistente.
 *
 * Las opciones permiten reemplazar el cliente (`crearCliente`) y el registro de
 * errores (`registrarError`), lo que hace posible probarlo sin consumir cuota.
 */
export function crearServicioIA({
  apiKey = process.env.GEMINI_API_KEY,
  modelo = process.env.GEMINI_MODEL || MODELO_POR_DEFECTO,
  contexto,
  tiempoMaximo = TIMEOUT_MS,
  maxTokens = MAX_TOKENS_RESPUESTA,
  // Sin reintentos automáticos: el plazo máximo es el total de la consulta.
  crearCliente = (clave) =>
    new GoogleGenAI({ apiKey: clave, httpOptions: { retryOptions: { attempts: 1 } } }),
  registrarError = console.error,
} = {}) {
  let cliente = null;
  let instrucciones = contexto;

  const obtenerCliente = () => {
    if (cliente) return cliente;
    if (!apiKey) throw new AsistenteError("configuracion");

    cliente = crearCliente(apiKey);
    return cliente;
  };

  // El contexto vive en prompts/, separado de la lógica del servicio.
  const obtenerInstrucciones = () => {
    if (instrucciones !== undefined) return instrucciones;

    try {
      instrucciones = readFileSync(RUTA_CONTEXTO, "utf-8").trim();
    } catch (error) {
      throw new AsistenteError("configuracion", error);
    }
    return instrucciones;
  };

  // Convierte cualquier fallo en un AsistenteError y deja registro en el
  // servidor, sin exponer la clave.
  const normalizarError = (error) => {
    const asistente =
      error instanceof AsistenteError
        ? error
        : new AsistenteError(clasificarError(error), error);

    const detalle = error === asistente ? "" : ` - ${ocultarClave(error?.message ?? "", apiKey)}`;
    registrarError(`[aiService] ${asistente.motivo}${detalle}`);

    return asistente;
  };

  const consultarIA = async (pregunta) => {
    const texto = validarPregunta(pregunta);

    try {
      const ia = obtenerCliente();
      const systemInstruction = obtenerInstrucciones();

      const respuesta = await conTimeout(
        (abortSignal) =>
          ia.models.generateContent({
            model: modelo,
            contents: texto,
            config: { systemInstruction, maxOutputTokens: maxTokens, abortSignal },
          }),
        tiempoMaximo,
      );

      return extraerTexto(respuesta);
    } catch (error) {
      throw normalizarError(error);
    }
  };

  return { consultarIA };
}

// Servicio compartido por la aplicación: se crea en la primera consulta.
let servicioPorDefecto = null;

export function consultarIA(pregunta) {
  servicioPorDefecto ??= crearServicioIA();
  return servicioPorDefecto.consultarIA(pregunta);
}
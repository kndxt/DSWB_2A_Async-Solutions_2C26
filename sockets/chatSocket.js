import { randomUUID } from "node:crypto";
import { ValidationError } from "../errors/errores.js";
import { revalidarSocket } from "./authSocket.js";
import asyncHandlerSocket from "./asyncHandlerSocket.js";
import { EVENTOS, TIPOS, LIMITE_TEXTO, AUTOR_ASISTENTE } from "./eventos.js";
import { extraerConsultaGemini } from "./mencionGemini.js";
import { consultarIA as consultarIAReal, AsistenteError } from "../services/aiService.js";

// Tiempo mínimo entre consultas de un mismo usuario.
const COOLDOWN_GEMINI_MS = 10_000;

// Construye un mensaje de sistema con el mismo formato que los demás mensajes.
const crearMensajeSistema = (texto) => ({
  id: randomUUID(),
  tipo: TIPOS.SISTEMA,
  autor: null,
  texto,
  fecha: new Date().toISOString(),
});

// Construye un mensaje de respuesta del asistente.
const crearMensajeAsistente = (texto) => ({
  id: randomUUID(),
  tipo: TIPOS.ASISTENTE,
  autor: AUTOR_ASISTENTE,
  texto,
  fecha: new Date().toISOString(),
});

// Consulta a Gemini y difunde su respuesta sin propagar errores al handler.
async function responderGemini(io, consultarIA, consulta) {
  try {
    const respuesta = await consultarIA(consulta);

    io.emit(EVENTOS.MENSAJE, crearMensajeAsistente(respuesta));
  } catch (error) {
    if (!(error instanceof AsistenteError)) {
      console.error("Error inesperado en la integración con Gemini:", error);
    }

    io.emit(
      EVENTOS.MENSAJE,
      crearMensajeAsistente(
        "Gemini no está disponible en este momento. Intentá nuevamente más tarde.",
      ),
    );
  }
}

/**
 * Registra los eventos del chat sobre las conexiones autenticadas.
 *
 * Permite inyectar el servicio de IA y el cooldown para facilitar
 * las pruebas de integración.
 */
export function registrarChat(
  io,
  { consultarIA = consultarIAReal, cooldownMs = COOLDOWN_GEMINI_MS } = {},
) {
  // Cantidad de sockets conectados por usuario.
  const conexionesPorUsuario = new Map();

  // Última consulta aceptada por usuario.
  const ultimaConsultaPorUsuario = new Map();

  io.on("connection", (socket) => {
    const usuario = socket.data.usuario;
    const usuarioId = String(usuario.id);

    // Registra la conexión y anuncia la entrada solo si es la primera.
    const conexionesActuales = conexionesPorUsuario.get(usuarioId) ?? 0;

    conexionesPorUsuario.set(usuarioId, conexionesActuales + 1);

    if (conexionesActuales === 0) {
      io.emit(EVENTOS.MENSAJE, crearMensajeSistema(`${usuario.nombre} se conectó al chat.`));
    }

    // Anuncia la salida únicamente cuando se desconecta la última conexión.
    socket.once("disconnect", () => {
      const conexionesRestantes = conexionesPorUsuario.get(usuarioId) ?? 0;

      if (conexionesRestantes <= 1) {
        conexionesPorUsuario.delete(usuarioId);

        io.emit(EVENTOS.MENSAJE, crearMensajeSistema(`${usuario.nombre} se desconectó del chat.`));
      } else {
        conexionesPorUsuario.set(usuarioId, conexionesRestantes - 1);
      }
    });

    socket.on(
      EVENTOS.MENSAJE,
      asyncHandlerSocket(socket, async (datos) => {
        // La sesión se revalida antes de aceptar cada mensaje.
        await revalidarSocket(socket);

        // El cliente debe enviar un objeto con un texto.
        if (
          !datos ||
          typeof datos !== "object" ||
          Array.isArray(datos) ||
          typeof datos.texto !== "string"
        ) {
          throw new ValidationError("El mensaje no tiene un formato válido.");
        }

        const texto = datos.texto.trim();

        if (!texto) {
          throw new ValidationError("El mensaje no puede estar vacío.");
        }

        if (texto.length > LIMITE_TEXTO) {
          throw new ValidationError(`El mensaje no puede superar los ${LIMITE_TEXTO} caracteres.`);
        }

        // La identidad y los metadatos se generan exclusivamente en el servidor.
        const mensaje = {
          id: randomUUID(),
          tipo: TIPOS.USUARIO,
          autor: {
            id: socket.data.usuario.id,
            nombre: socket.data.usuario.nombre,
          },
          texto,
          fecha: new Date().toISOString(),
        };

        // Difunde el mensaje a todos los clientes conectados, incluido el emisor.
        io.emit(EVENTOS.MENSAJE, mensaje);

        // Si no hay una mención válida, el procesamiento termina acá.
        const consulta = extraerConsultaGemini(texto);

        if (!consulta) return;

        // Limpia entradas vencidas para evitar conservar usuarios indefinidamente.
        const ahora = Date.now();

        for (const [id, ultimaConsulta] of ultimaConsultaPorUsuario) {
          if (ahora - ultimaConsulta >= cooldownMs) {
            ultimaConsultaPorUsuario.delete(id);
          }
        }

        const ultimaConsulta = ultimaConsultaPorUsuario.get(usuarioId);

        // Rechaza consultas demasiado próximas de un mismo usuario.
        if (ultimaConsulta !== undefined && ahora - ultimaConsulta < cooldownMs) {
          socket.emit(EVENTOS.ERROR, {
            mensaje: "Esperá unos segundos antes de volver a consultar a Gemini.",
          });
          return;
        }

        // Registra el momento antes de iniciar la consulta.
        ultimaConsultaPorUsuario.set(usuarioId, ahora);

        // No se espera la respuesta: el chat puede seguir procesando mensajes.
        void responderGemini(io, consultarIA, consulta);
      }),
    );
  });
}

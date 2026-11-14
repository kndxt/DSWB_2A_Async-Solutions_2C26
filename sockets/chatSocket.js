import { randomUUID } from "node:crypto";
import { ValidationError } from "../errors/errores.js";
import { revalidarSocket } from "./authSocket.js";
import asyncHandlerSocket from "./asyncHandlerSocket.js";
import { EVENTOS, TIPOS, LIMITE_TEXTO, AUTOR_ASISTENTE } from "./eventos.js";
import { extraerConsultaGemini } from "./mencionGemini.js";
import { consultarIA as consultarIAReal, AsistenteError } from "../services/aiService.js";

// Tiempo mínimo entre consultas de un mismo usuario.
const COOLDOWN_GEMINI_MS = 10_000;

// Límite general de mensajes por usuario.
const LIMITE_MENSAJES = 5;
const VENTANA_MENSAJES_MS = 10_000;
const MAX_RECHAZOS = 3;

// Máximo de conexiones simultáneas por usuario.
const MAX_CONEXIONES = 3;

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
 * Elimina los registros de frecuencia que ya salieron de su ventana.
 * Se ejecuta al recibir mensajes para evitar conservar datos vencidos.
 *
 * Si el volumen de conexiones crece, evaluar una estrategia de limpieza más eficiente.
 */
function limpiarLimitesVencidos(limitesPorUsuario, ahora, ventanaMs) {
  for (const [usuarioId, estado] of limitesPorUsuario) {
    estado.mensajes = estado.mensajes.filter((marca) => ahora - marca < ventanaMs);

    estado.rechazos = estado.rechazos.filter((marca) => ahora - marca < ventanaMs);

    if (estado.mensajes.length === 0 && estado.rechazos.length === 0) {
      limitesPorUsuario.delete(usuarioId);
    }
  }
}

/**
 * Comprueba si el usuario puede enviar otro mensaje.
 * El estado se comparte entre todas sus conexiones.
 */
function excedioLimiteMensajes(
  usuarioId,
  limitesPorUsuario,
  ahora,
  limiteMensajes,
  ventanaMs,
  maxRechazos,
  socket,
) {
  limpiarLimitesVencidos(limitesPorUsuario, ahora, ventanaMs);

  const estado = limitesPorUsuario.get(usuarioId) ?? {
    mensajes: [],
    rechazos: [],
  };

  if (estado.mensajes.length >= limiteMensajes) {
    estado.rechazos.push(ahora);
    limitesPorUsuario.set(usuarioId, estado);

    socket.emit(EVENTOS.ERROR, {
      mensaje: "Estás enviando mensajes demasiado rápido. Esperá unos segundos.",
    });

    if (estado.rechazos.length >= maxRechazos) {
      socket.disconnect(true);
    }

    return true;
  }

  estado.mensajes.push(ahora);
  limitesPorUsuario.set(usuarioId, estado);

  return false;
}

/**
 * Registra los eventos del chat sobre las conexiones autenticadas.
 *
 * Permite inyectar el servicio de IA y el cooldown para facilitar
 * las pruebas de integración.
 */
export function registrarChat(
  io,
  {
    consultarIA = consultarIAReal,
    cooldownMs = COOLDOWN_GEMINI_MS,
    limiteMensajes = LIMITE_MENSAJES,
    ventanaMensajesMs = VENTANA_MENSAJES_MS,
    maxRechazos = MAX_RECHAZOS,
    maxConexiones = MAX_CONEXIONES,
    obtenerAhora = Date.now,
  } = {},
) {
  // Cantidad de sockets conectados por usuario.
  const conexionesPorUsuario = new Map();

  // Última consulta aceptada por usuario.
  const ultimaConsultaPorUsuario = new Map();

  // Marcas de mensajes y rechazos por usuario.
  const limitesPorUsuario = new Map();

  io.on("connection", (socket) => {
    const usuario = socket.data.usuario;
    const usuarioId = String(usuario.id);

    // Registra la conexión y anuncia la entrada solo si es la primera.
    const conexionesActuales = conexionesPorUsuario.get(usuarioId) ?? 0;

    // Rechaza conexiones que superen el máximo permitido.
    if (conexionesActuales >= maxConexiones) {
      socket.emit(EVENTOS.ERROR, {
        mensaje: "Alcanzaste el máximo de conexiones simultáneas al chat.",
      });

      socket.disconnect(true);
      return;
    }

    // Registra la conexión y anuncia la entrada solo si es la primera.
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
        // El límite se aplica a todos los intentos, incluso los malformados.
        const ahora = obtenerAhora();

        if (
          excedioLimiteMensajes(
            usuarioId,
            limitesPorUsuario,
            ahora,
            limiteMensajes,
            ventanaMensajesMs,
            maxRechazos,
            socket,
          )
        ) {
          return;
        }

        // La sesión se revalida antes de aceptar cada mensaje.
        await revalidarSocket(socket);

        // El cliente debe enviar un objeto plano con únicamente la propiedad texto.
        if (
          !datos ||
          typeof datos !== "object" ||
          Array.isArray(datos) ||
          Object.getPrototypeOf(datos) !== Object.prototype ||
          Object.keys(datos).length !== 1 ||
          !Object.hasOwn(datos, "texto") ||
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

        // Limpia consultas vencidas para evitar conservar usuarios indefinidamente.
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

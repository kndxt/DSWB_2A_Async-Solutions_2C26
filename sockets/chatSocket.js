import { randomUUID } from "node:crypto";
import { ValidationError } from "../errors/errores.js";
import { revalidarSocket } from "./authSocket.js";
import asyncHandlerSocket from "./asyncHandlerSocket.js";
import { EVENTOS, TIPOS, LIMITE_TEXTO } from "./eventos.js";

// Construye un mensaje de sistema con el mismo formato que los demás mensajes.
const crearMensajeSistema = (texto) => ({
  id: randomUUID(),
  tipo: TIPOS.SISTEMA,
  autor: null,
  texto,
  fecha: new Date().toISOString(),
});

/**
 * Registra los eventos del chat sobre las conexiones autenticadas.
 */
export function registrarChat(io) {
  // Cantidad de sockets conectados por usuario.
  const conexionesPorUsuario = new Map();

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
      }),
    );
  });
}

import { UnauthorizedError, ForbiddenError } from "../errors/errores.js";
import traducirError from "../errors/traducirError.js";
import { EVENTOS } from "./eventos.js";

/**
 * Centraliza el tratamiento de errores ocurridos en eventos Socket.IO.
 */
const manejarErrorSocket = (err, socket) => {
  const error = traducirError(err);

  // Una sesión inválida o un usuario inactivo ya no pueden continuar conectados.
  if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
    socket.emit(EVENTOS.SESION_EXPIRADA);
    socket.disconnect();
    return;
  }

  const statusCode = error.statusCode ?? error.status;

  // Los errores operativos de cliente pueden comunicarse con su mensaje.
  if (
    error.isOperational &&
    Number.isInteger(statusCode) &&
    statusCode >= 400 &&
    statusCode < 500
  ) {
    socket.emit(EVENTOS.ERROR, {
      mensaje: error.message,
    });
    return;
  }

  // Los errores internos se registran en el servidor, no se exponen al cliente.
  console.error("Error en evento Socket.IO:", error);

  socket.emit(EVENTOS.ERROR, {
    mensaje: "Ocurrió un error interno. Intentá nuevamente más tarde.",
  });
};

export default manejarErrorSocket;

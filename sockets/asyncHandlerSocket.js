import manejarErrorSocket from "./errorSocket.js";

/**
 * Envuelve un handler asíncrono de Socket.IO y deriva sus errores
 * al manejador centralizado.
 */
const asyncHandlerSocket = (socket, handler) => {
  return (...args) => {
    Promise.resolve()
      .then(() => handler(...args))
      .catch((error) => {
        manejarErrorSocket(error, socket);
      });
  };
};

export default asyncHandlerSocket;

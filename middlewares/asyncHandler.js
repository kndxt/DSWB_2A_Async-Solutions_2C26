
/**
 * Envuelve un handler asíncrono para derivar los rechazos
 * de su promesa al middleware centralizado de errores.
 */

const asyncHandler = (handler) => {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};

export default asyncHandler;
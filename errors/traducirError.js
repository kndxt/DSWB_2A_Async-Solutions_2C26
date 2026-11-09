import { ValidationError, ConflictError } from "./errores.js";

/**
 * Traduce errores técnicos conocidos a errores de la aplicación.
 */
const traducirError = (err) => {
  // Error de validación del esquema de Mongoose.
  if (err.name === "ValidationError") {
    const error = new ValidationError("Los datos proporcionados no son válidos.");
    error.cause = err;
    return error;
  }

  // Error por intentar guardar un valor duplicado en un índice único.
  if (err.code === 11000) {
    const error = new ConflictError("El recurso ya existe o contiene un dato duplicado.");
    error.cause = err;
    return error;
  }

  // Conserva los errores que todavía no tienen una traducción definida.
  return err;
};

export default traducirError;
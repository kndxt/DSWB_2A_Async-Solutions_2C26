/**
 * Clase base para representar errores esperados de la aplicación.
 */
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace?.(this, this.constructor);
  }
}

// Error de datos inválidos.
export class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

// Error de recurso inexistente.
export class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404);
  }
}

// Error por conflicto con el estado actual de un recurso.
export class ConflictError extends AppError {
  constructor(message) {
    super(message, 409);
  }
}

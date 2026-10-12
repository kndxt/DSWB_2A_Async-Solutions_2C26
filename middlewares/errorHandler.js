
const errorHandler = (err, req, res, next) => {

// Si los encabezados de la respuesta ya se enviaron, evita intentar enviar otra respuesta.
// Delega el error a Express para que lo maneje según corresponda.

  if (res.headersSent) {
    return next(err);
  }

// Guarda el código de estado a partir del error proporcionado.

  const providedStatus = err.statusCode ?? err.status;

// Valida el código de estado obtenido. Si no es válido, se asigna 500.

  const statusCode =
    Number.isInteger(providedStatus) && providedStatus >= 400 && providedStatus <= 599
      ? providedStatus
      : 500;

  const response = {
    message:
      statusCode >= 500
        ? 'Error interno del servidor'
        : err.message || 'Error en la solicitud'
  };

  res.status(statusCode).json(response);

};

export default errorHandler;

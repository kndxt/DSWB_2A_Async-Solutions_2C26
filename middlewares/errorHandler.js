
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


  const esVista =
    req.path === "/vistas" || req.path.startsWith("/vistas/");

  // Para las vistas, renderiza una página HTML de error.
  if (esVista) {
    return res.status(statusCode).render("error", {
      mensaje:
        statusCode >= 500
          ? "Ocurrió un error interno. Intentá nuevamente más tarde."
          : err.message || "No se pudo completar la solicitud."
    });
  }

  // Para la API y el resto de las rutas, conserva la respuesta JSON.
  const response = {
    error:
      statusCode >= 500
        ? 'Error interno del servidor'
        : err.message || 'Error en la solicitud'
  };

  res.status(statusCode).json(response);

};

export default errorHandler;

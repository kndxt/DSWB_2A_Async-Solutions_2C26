import traducirError from "../errors/traducirError.js";

/**
 * Genera una respuesta HTTP uniforme para los errores de la aplicación.
 */
const errorHandler = (err, req, res, next) => {

// Si los encabezados de la respuesta ya se enviaron, evita intentar enviar otra respuesta.
// Delega el error a Express para que lo maneje según corresponda.
  if (res.headersSent) {
    return next(err);
  }

  // Traduce los errores técnicos conocidos a errores de aplicación.
  const error = traducirError(err);

  // Solo considera desarrollo cuando NODE_ENV tiene ese valor exacto.
  const esDesarrollo = process.env.NODE_ENV === "development";

  // Guarda el código de estado a partir del error proporcionado.
  const providedStatus = error.statusCode ?? error.status;

  // Valida el código HTTP. Si no es válido, utiliza 500.
  const statusCode =
    Number.isInteger(providedStatus) && providedStatus >= 400 && providedStatus <= 599
      ? providedStatus
      : 500;

  // Los errores internos siempre tienen un mensaje seguro para el cliente.
  const mensaje =
    statusCode >= 500
      ? "Ocurrió un error interno. Intentá nuevamente más tarde."
      : error.message || "No se pudo completar la solicitud.";

  // Información técnica disponible únicamente durante el desarrollo.
  const detalles = esDesarrollo
    ? {
        nombre: error.name,
        mensaje: error.message,
        stack: error.stack,
        causa: error.cause
          ? {
              nombre: error.cause.name,
              mensaje: error.cause.message,
              stack: error.cause.stack,
            }
          : undefined,
      }
    : undefined;


  const esVista =
    req.path === "/vistas" || req.path.startsWith("/vistas/");

  // Para las vistas, renderiza la página de error.
  if (esVista) {
    return res.status(statusCode).render("error", {
      mensaje,
      detalles,
    });
  }

  // Para la API, responde en JSON.
  const response = { error: mensaje };

  // Agrega información técnica únicamente durante el desarrollo.
  if (detalles) {
    response.detalles = detalles;
  }

  return res.status(statusCode).json(response);

};

export default errorHandler;

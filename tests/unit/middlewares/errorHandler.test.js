import test, { describe } from "node:test";
import assert from "node:assert/strict";

import errorHandler from "../../../middlewares/errorHandler.js";
import {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from "../../../errors/errores.js";

// ---------------------------------------------------------------
// Helper para ejecutar el middleware
// ---------------------------------------------------------------

/**
 * Ejecuta el errorHandler simulando req y res.
 * Permite configurar la ruta, el entorno y el estado de la respuesta.
 */
const ejecutarErrorHandler = (
  error,
  { path = "/api/entradas", headersSent = false, nodeEnv = "production" } = {},
) => {
  const entornoAnterior = process.env.NODE_ENV;

  if (nodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = nodeEnv;
  }

  const resultado = {
    statusCode: null,
    json: null,
    vista: null,
    datosVista: null,
    errorSiguiente: null,
  };

  const req = { path };

  const res = {
    headersSent,

    status(codigo) {
      resultado.statusCode = codigo;
      return this;
    },

    json(datos) {
      resultado.json = datos;
      return this;
    },

    render(vista, datos) {
      resultado.vista = vista;
      resultado.datosVista = datos;
      return this;
    },
  };

  const next = (err) => {
    resultado.errorSiguiente = err;
  };

  try {
    errorHandler(error, req, res, next);
  } finally {
    if (entornoAnterior === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = entornoAnterior;
    }
  }

  return resultado;
};

// ---------------------------------------------------------------
// Errores de aplicación
// Verifica los códigos HTTP y mensajes de las clases propias
// ---------------------------------------------------------------

describe("Errores de aplicación", () => {
  test("responde con el código HTTP y mensaje correspondiente a cada error", () => {
    const casos = [
      {
        error: new ValidationError("Datos inválidos"),
        statusCode: 400,
      },
      {
        error: new UnauthorizedError("No hay sesión iniciada"),
        statusCode: 401,
      },
      {
        error: new ForbiddenError("No tenés permiso para realizar esta acción"),
        statusCode: 403,
      },
      {
        error: new NotFoundError("Recurso no encontrado"),
        statusCode: 404,
      },
      {
        error: new ConflictError("Conflicto con el recurso"),
        statusCode: 409,
      },
    ];

    for (const { error, statusCode } of casos) {
      const resultado = ejecutarErrorHandler(error);

      assert.equal(resultado.statusCode, statusCode);
      assert.equal(resultado.json.error, error.message);
      assert.equal(resultado.json.detalles, undefined);
    }
  });

  test("incluye detalles técnicos de errores de aplicación en desarrollo", () => {
    const error = new ValidationError("Datos inválidos");

    const resultado = ejecutarErrorHandler(error, {
      nodeEnv: "development",
    });

    assert.equal(resultado.statusCode, 400);
    assert.equal(resultado.json.error, "Datos inválidos");
    assert.equal(resultado.json.detalles.mensaje, "Datos inválidos");
  });
});

// ---------------------------------------------------------------
// Errores internos
// Verifica el tratamiento de errores inesperados según el entorno
// ---------------------------------------------------------------

describe("Errores internos", () => {
  test("responde con un mensaje seguro sin exponer detalles en producción", () => {
    const error = new Error("Detalle técnico interno");

    const resultado = ejecutarErrorHandler(error, {
      nodeEnv: "production",
    });

    assert.equal(resultado.statusCode, 500);
    assert.equal(resultado.json.error, "Ocurrió un error interno. Intentá nuevamente más tarde.");
    assert.equal(resultado.json.detalles, undefined);
  });

  test("incluye detalles técnicos en desarrollo", () => {
    const error = new Error("Detalle técnico interno");

    const resultado = ejecutarErrorHandler(error, {
      nodeEnv: "development",
    });

    assert.equal(resultado.statusCode, 500);
    assert.equal(resultado.json.error, "Ocurrió un error interno. Intentá nuevamente más tarde.");
    assert.equal(resultado.json.detalles.nombre, "Error");
    assert.equal(resultado.json.detalles.mensaje, "Detalle técnico interno");
    assert.ok(resultado.json.detalles.stack);
  });
});

// ---------------------------------------------------------------
// Respuestas según el tipo de ruta
// Verifica el uso de JSON o de la vista de error
// ---------------------------------------------------------------

describe("Respuestas según el tipo de ruta", () => {
  test("renderiza la vista de error para rutas /vistas", () => {
    const error = new NotFoundError("Recurso no encontrado");

    const resultado = ejecutarErrorHandler(error, {
      path: "/vistas/entradas",
    });

    assert.equal(resultado.statusCode, 404);
    assert.equal(resultado.vista, "error");
    assert.equal(resultado.datosVista.mensaje, "Recurso no encontrado");
    assert.equal(resultado.json, null);
  });

  test("responde en JSON cuando la ruta no pertenece a /vistas", () => {
    const error = new NotFoundError("Recurso no encontrado");

    const resultado = ejecutarErrorHandler(error, {
      path: "/vistasExtra",
    });

    assert.equal(resultado.statusCode, 404);
    assert.equal(resultado.json.error, "Recurso no encontrado");
    assert.equal(resultado.vista, null);
  });
});

// ---------------------------------------------------------------
// Manejo de la respuesta HTTP
// Verifica que no se envíen respuestas duplicadas ni estados inválidos
// ---------------------------------------------------------------

describe("Manejo de la respuesta HTTP", () => {
  test("delega el error cuando los encabezados ya fueron enviados", () => {
    const error = new Error("Error posterior al envío de respuesta");

    const resultado = ejecutarErrorHandler(error, {
      headersSent: true,
    });

    assert.strictEqual(resultado.errorSiguiente, error);
    assert.equal(resultado.statusCode, null);
    assert.equal(resultado.json, null);
    assert.equal(resultado.vista, null);
  });

  test("utiliza 500 cuando el código de estado del error no es válido", () => {
    const error = new Error("Error con código inválido");
    error.statusCode = 200;

    const resultado = ejecutarErrorHandler(error);

    assert.equal(resultado.statusCode, 500);
    assert.equal(resultado.json.error, "Ocurrió un error interno. Intentá nuevamente más tarde.");
  });
});

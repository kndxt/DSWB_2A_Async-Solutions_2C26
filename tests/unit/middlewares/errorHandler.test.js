
import test from "node:test";
import assert from "node:assert/strict";

import errorHandler from "../../../middlewares/errorHandler.js";
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from "../../../errors/errores.js";

/**
 * Ejecuta el errorHandler simulando req y res.
 * Permite configurar la ruta, el entorno y el estado de la respuesta.
 */
const ejecutarErrorHandler = (
  error,
  {
    path = "/api/entradas",
    headersSent = false,
    nodeEnv = "production",
  } = {}
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

// Comprueba que los errores de aplicación conserven su código y mensaje.
test("responde con el código HTTP y mensaje de los errores de aplicación", () => {
  const casos = [
    {
      error: new ValidationError("Datos inválidos"),
      statusCode: 400,
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

// Comprueba que los errores internos no expongan información técnica en producción.
test("responde con un mensaje seguro para errores internos en producción", () => {
  const error = new Error("Detalle técnico interno");

  const resultado = ejecutarErrorHandler(error, {
    nodeEnv: "production",
  });

  assert.equal(resultado.statusCode, 500);
  assert.equal(
    resultado.json.error,
    "Ocurrió un error interno. Intentá nuevamente más tarde."
  );
  assert.equal(resultado.json.detalles, undefined);
});

// Comprueba que los errores internos incluyan detalles técnicos en desarrollo.
test("incluye detalles técnicos en desarrollo", () => {
  const error = new Error("Detalle técnico interno");

  const resultado = ejecutarErrorHandler(error, {
    nodeEnv: "development",
  });

  assert.equal(resultado.statusCode, 500);
  assert.equal(
    resultado.json.error,
    "Ocurrió un error interno. Intentá nuevamente más tarde."
  );
  assert.equal(resultado.json.detalles.nombre, "Error");
  assert.equal(
    resultado.json.detalles.mensaje,
    "Detalle técnico interno"
  );
  assert.ok(resultado.json.detalles.stack);
});

// Comprueba que los detalles de errores de aplicación también se incluyan en desarrollo.
test("incluye detalles técnicos de errores de aplicación en desarrollo", () => {
  const error = new ValidationError("Datos inválidos");

  const resultado = ejecutarErrorHandler(error, {
    nodeEnv: "development",
  });

  assert.equal(resultado.statusCode, 400);
  assert.equal(resultado.json.error, "Datos inválidos");
  assert.equal(
    resultado.json.detalles.mensaje,
    "Datos inválidos"
  );
});

// Comprueba que las rutas de vistas rendericen la página de error.
test("renderiza la vista de error para rutas /vistas", () => {
  const error = new NotFoundError("Recurso no encontrado");

  const resultado = ejecutarErrorHandler(error, {
    path: "/vistas/entradas",
  });

  assert.equal(resultado.statusCode, 404);
  assert.equal(resultado.vista, "error");
  assert.equal(
    resultado.datosVista.mensaje,
    "Recurso no encontrado"
  );
  assert.equal(resultado.json, null);
});

// Comprueba que las rutas que solo comienzan con un nombre similar no se consideren vistas.
test("responde en JSON cuando la ruta no pertenece a /vistas", () => {
  const error = new NotFoundError("Recurso no encontrado");

  const resultado = ejecutarErrorHandler(error, {
    path: "/vistasExtra",
  });

  assert.equal(resultado.statusCode, 404);
  assert.equal(resultado.json.error, "Recurso no encontrado");
  assert.equal(resultado.vista, null);
});

// Comprueba que no intente enviar otra respuesta si los encabezados ya fueron enviados.
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

// Comprueba que los códigos HTTP fuera del rango permitido se conviertan en 500.
test("utiliza 500 cuando el código de estado del error no es válido", () => {
  const error = new Error("Error con código inválido");
  error.statusCode = 200;

  const resultado = ejecutarErrorHandler(error);

  assert.equal(resultado.statusCode, 500);
  assert.equal(
    resultado.json.error,
    "Ocurrió un error interno. Intentá nuevamente más tarde."
  );
});

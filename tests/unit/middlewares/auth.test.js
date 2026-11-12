/**
 * Prueba la integración entre los middlewares de autenticación,
 * la gestión de tokens JWT y la lectura de cookies.
 *
 * Verifica la identificación de sesiones, la validación de tokens,
 * la recuperación y el estado de los usuarios y el control de roles.
 *
 * Las consultas a la base de datos se simulan para probar el
 * comportamiento sin depender de MongoDB.
 */

import test, { describe } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

// Se configura el secreto antes de importar los módulos que lo utilizan.
const JWT_SECRET_TEST = "secreto-de-prueba-para-auth";
process.env.JWT_SECRET = JWT_SECRET_TEST;
process.env.JWT_EXPIRES_IN = "1h";

// Dependencias y módulos bajo prueba.
const { default: Usuario } = await import("../../../models/usuarioModel.js");
const { ESTADOS_USUARIO, ROLES_USUARIO } = await import("../../../models/usuarioModel.js");

const { generarToken } = await import("../../../utils/jwt.js");

const { autenticar, autorizar, autenticarOpcional } = await import("../../../middlewares/auth.js");

const { UnauthorizedError, ForbiddenError } = await import("../../../errors/errores.js");

/**
 * Ejecuta autenticar y reemplaza la consulta al modelo
 * para no necesitar una base de datos.
 *
 * Captura el error de aplicación propagado mediante next().
 */
async function ejecutarAutenticar(t, { cookies, usuario, errorConsulta } = {}) {
  const req = { cookies };

  const consulta = t.mock.method(Usuario, "obtenerPorId", async () => {
    if (errorConsulta) throw errorConsulta;
    return usuario ?? null;
  });

  const resultado = await new Promise((resolve) => {
    const next = (error) => {
      resolve(error ? { tipo: "error", error } : { tipo: "next" });
    };

    autenticar(req, {}, next);
  });

  return { req, resultado, consulta };
}

/**
 * Ejecuta autenticarOpcional y reemplaza la consulta al modelo
 * para no necesitar una base de datos.
 *
 * Captura los errores propagados mediante next().
 */
async function ejecutarAutenticarOpcional(t, { cookies, usuario, errorConsulta } = {}) {
  const req = { cookies };

  const res = {
    locals: {},
  };

  const consulta = t.mock.method(Usuario, "obtenerPorId", async () => {
    if (errorConsulta) throw errorConsulta;
    return usuario ?? null;
  });

  const resultado = await new Promise((resolve) => {
    const next = (error) => {
      resolve(error ? { tipo: "error", error } : { tipo: "next" });
    };

    autenticarOpcional(req, res, next);
  });

  return { req, res, resultado, consulta };
}

// -----------------------------------------------------------------------------
// AUTENTICAR
// -----------------------------------------------------------------------------

describe("autenticar", () => {
  describe("validación de sesión y token", () => {
    test("propaga UnauthorizedError cuando no hay cookie de sesión", async (t) => {
      const { resultado, consulta } = await ejecutarAutenticar(t);

      assert.equal(resultado.tipo, "error");
      assert.ok(resultado.error instanceof UnauthorizedError);
      assert.equal(resultado.error.statusCode, 401);
      assert.equal(resultado.error.message, "No hay sesión iniciada");
      assert.equal(consulta.mock.calls.length, 0);
    });

    test("propaga UnauthorizedError cuando el token es inválido", async (t) => {
      const { resultado, consulta } = await ejecutarAutenticar(t, {
        cookies: { token: "esto-no-es-un-jwt" },
      });

      assert.equal(resultado.tipo, "error");
      assert.ok(resultado.error instanceof UnauthorizedError);
      assert.equal(resultado.error.statusCode, 401);
      assert.equal(resultado.error.message, "Token inválido o expirado");
      assert.equal(consulta.mock.calls.length, 0);
    });

    test("propaga UnauthorizedError cuando el token no contiene un ID de usuario", async (t) => {
      const token = jwt.sign({ rol: ROLES_USUARIO.CLIENTE }, JWT_SECRET_TEST);

      const { resultado, consulta } = await ejecutarAutenticar(t, {
        cookies: { token },
      });

      assert.equal(resultado.tipo, "error");
      assert.ok(resultado.error instanceof UnauthorizedError);
      assert.equal(resultado.error.statusCode, 401);
      assert.equal(resultado.error.message, "Token inválido o expirado");
      assert.equal(consulta.mock.calls.length, 0);
    });
  });

  describe("validación del usuario", () => {
    test("propaga UnauthorizedError cuando el usuario del token no existe", async (t) => {
      const token = generarToken({
        id: "usuario-123",
        rol: ROLES_USUARIO.CLIENTE,
      });

      const { resultado, consulta } = await ejecutarAutenticar(t, {
        cookies: { token },
      });

      assert.equal(resultado.tipo, "error");
      assert.ok(resultado.error instanceof UnauthorizedError);
      assert.equal(resultado.error.statusCode, 401);
      assert.equal(resultado.error.message, "Usuario no encontrado");
      assert.equal(consulta.mock.calls.length, 1);
      assert.equal(consulta.mock.calls[0].arguments[0], "usuario-123");
    });

    test("propaga ForbiddenError cuando el usuario existe pero está inactivo", async (t) => {
      const token = generarToken({
        id: "usuario-123",
        rol: ROLES_USUARIO.CLIENTE,
      });

      const usuario = {
        id: "usuario-123",
        estado: ESTADOS_USUARIO.INACTIVO,
        rol: ROLES_USUARIO.CLIENTE,
      };

      const { resultado } = await ejecutarAutenticar(t, {
        cookies: { token },
        usuario,
      });

      assert.equal(resultado.tipo, "error");
      assert.ok(resultado.error instanceof ForbiddenError);
      assert.equal(resultado.error.statusCode, 403);
      assert.equal(resultado.error.message, "El usuario se encuentra inactivo");
    });
  });

  describe("sesión autenticada", () => {
    test("asigna el usuario a req.usuario y continúa cuando la sesión es válida", async (t) => {
      const token = generarToken({
        id: "usuario-123",
        rol: ROLES_USUARIO.CLIENTE,
      });

      const usuario = {
        id: "usuario-123",
        estado: ESTADOS_USUARIO.ACTIVO,
        rol: ROLES_USUARIO.CLIENTE,
      };

      const { req, resultado, consulta } = await ejecutarAutenticar(t, {
        cookies: { token },
        usuario,
      });

      assert.equal(resultado.tipo, "next");
      assert.equal(resultado.error, undefined);
      assert.equal(req.usuario, usuario);
      assert.equal(consulta.mock.calls.length, 1);
      assert.equal(consulta.mock.calls[0].arguments[0], "usuario-123");
    });
  });

  describe("errores de consulta", () => {
    test("propaga a next el error cuando falla la consulta del usuario", async (t) => {
      const token = generarToken({
        id: "usuario-123",
        rol: ROLES_USUARIO.CLIENTE,
      });

      const error = new Error("Error de conexión a la base de datos");

      const { resultado } = await ejecutarAutenticar(t, {
        cookies: { token },
        errorConsulta: error,
      });

      assert.equal(resultado.tipo, "error");
      assert.equal(resultado.error, error);
    });
  });
});

// -----------------------------------------------------------------------------
// AUTORIZAR
// -----------------------------------------------------------------------------

describe("autorizar", () => {
  describe("validación de autenticación", () => {
    test("lanza UnauthorizedError cuando no hay un usuario autenticado", () => {
      const req = {};
      let continuo = false;

      const next = () => {
        continuo = true;
      };

      assert.throws(
        () => autorizar(ROLES_USUARIO.ADMIN)(req, {}, next),
        (error) => {
          assert.ok(error instanceof UnauthorizedError);
          assert.equal(error.statusCode, 401);
          assert.equal(error.message, "No hay sesión iniciada");
          return true;
        },
      );

      assert.equal(continuo, false);
    });
  });

  describe("validación de roles", () => {
    test("lanza ForbiddenError cuando el rol del usuario no está permitido", () => {
      const req = {
        usuario: { rol: ROLES_USUARIO.CLIENTE },
      };

      let continuo = false;

      const next = () => {
        continuo = true;
      };

      assert.throws(
        () => autorizar(ROLES_USUARIO.ADMIN)(req, {}, next),
        (error) => {
          assert.ok(error instanceof ForbiddenError);
          assert.equal(error.statusCode, 403);
          assert.equal(error.message, "No tenés permiso para realizar esta acción");
          return true;
        },
      );

      assert.equal(continuo, false);
    });

    test("continúa cuando el rol del usuario está permitido", () => {
      const req = {
        usuario: { rol: ROLES_USUARIO.ADMIN },
      };

      let llamadasNext = 0;

      const next = () => {
        llamadasNext++;
      };

      autorizar(ROLES_USUARIO.ADMIN)(req, {}, next);

      assert.equal(llamadasNext, 1);
    });

    test("acepta al usuario cuando su rol coincide con uno de varios roles permitidos", () => {
      const req = {
        usuario: { rol: ROLES_USUARIO.CLIENTE },
      };

      let llamadasNext = 0;

      const next = () => {
        llamadasNext++;
      };

      autorizar(ROLES_USUARIO.ADMIN, ROLES_USUARIO.CLIENTE)(req, {}, next);

      assert.equal(llamadasNext, 1);
    });
  });
});

// -----------------------------------------------------------------------------
// AUTENTICAR OPCIONAL
// -----------------------------------------------------------------------------

describe("autenticarOpcional", () => {
  describe("solicitudes sin sesión válida", () => {
    test("continúa sin usuario cuando no hay cookie de sesión", async (t) => {
      const { req, res, resultado, consulta } = await ejecutarAutenticarOpcional(t);

      assert.equal(resultado.tipo, "next");
      assert.equal(resultado.error, undefined);
      assert.equal(req.usuario, undefined);
      assert.equal(res.locals.usuario, null);
      assert.equal(consulta.mock.calls.length, 0);
    });

    test("continúa sin usuario cuando el token es inválido", async (t) => {
      const { req, res, resultado, consulta } = await ejecutarAutenticarOpcional(t, {
        cookies: { token: "esto-no-es-un-jwt" },
      });

      assert.equal(resultado.tipo, "next");
      assert.equal(resultado.error, undefined);
      assert.equal(req.usuario, undefined);
      assert.equal(res.locals.usuario, null);
      assert.equal(consulta.mock.calls.length, 0);
    });

    test("continúa sin usuario cuando el token no contiene un ID", async (t) => {
      const token = jwt.sign({ rol: ROLES_USUARIO.CLIENTE }, JWT_SECRET_TEST);

      const { req, res, resultado, consulta } = await ejecutarAutenticarOpcional(t, {
        cookies: { token },
      });

      assert.equal(resultado.tipo, "next");
      assert.equal(resultado.error, undefined);
      assert.equal(req.usuario, undefined);
      assert.equal(res.locals.usuario, null);
      assert.equal(consulta.mock.calls.length, 0);
    });
  });

  describe("validación del usuario", () => {
    test("continúa sin usuario cuando el usuario del token no existe", async (t) => {
      const token = generarToken({
        id: "usuario-123",
        rol: ROLES_USUARIO.CLIENTE,
      });

      const { req, res, resultado, consulta } = await ejecutarAutenticarOpcional(t, {
        cookies: { token },
      });

      assert.equal(resultado.tipo, "next");
      assert.equal(req.usuario, undefined);
      assert.equal(res.locals.usuario, null);
      assert.equal(consulta.mock.calls.length, 1);
      assert.equal(consulta.mock.calls[0].arguments[0], "usuario-123");
    });

    test("continúa sin usuario cuando el usuario está inactivo", async (t) => {
      const token = generarToken({
        id: "usuario-123",
        rol: ROLES_USUARIO.CLIENTE,
      });

      const usuario = {
        id: "usuario-123",
        estado: ESTADOS_USUARIO.INACTIVO,
        rol: ROLES_USUARIO.CLIENTE,
      };

      const { req, res, resultado } = await ejecutarAutenticarOpcional(t, {
        cookies: { token },
        usuario,
      });

      assert.equal(resultado.tipo, "next");
      assert.equal(req.usuario, undefined);
      assert.equal(res.locals.usuario, null);
    });
  });

  describe("sesión autenticada", () => {
    test("asigna el usuario a req.usuario y res.locals.usuario cuando la sesión es válida", async (t) => {
      const token = generarToken({
        id: "usuario-123",
        rol: ROLES_USUARIO.CLIENTE,
      });

      const usuario = {
        id: "usuario-123",
        estado: ESTADOS_USUARIO.ACTIVO,
        rol: ROLES_USUARIO.CLIENTE,
      };

      const { req, res, resultado, consulta } = await ejecutarAutenticarOpcional(t, {
        cookies: { token },
        usuario,
      });

      assert.equal(resultado.tipo, "next");
      assert.equal(resultado.error, undefined);
      assert.equal(req.usuario, usuario);
      assert.equal(res.locals.usuario, usuario);
      assert.equal(consulta.mock.calls.length, 1);
      assert.equal(consulta.mock.calls[0].arguments[0], "usuario-123");
    });
  });

  describe("errores de consulta", () => {
    test("propaga a next el error cuando falla la consulta del usuario", async (t) => {
      const token = generarToken({
        id: "usuario-123",
        rol: ROLES_USUARIO.CLIENTE,
      });

      const error = new Error("Error de conexión a la base de datos");

      const { resultado } = await ejecutarAutenticarOpcional(t, {
        cookies: { token },
        errorConsulta: error,
      });

      assert.equal(resultado.tipo, "error");
      assert.equal(resultado.error, error);
    });
  });
});

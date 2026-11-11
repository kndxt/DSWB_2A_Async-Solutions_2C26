/**
 * Prueba la integración entre el middleware de autenticación,
 * la gestión de tokens JWT y la lectura de cookies.
 *
 * Verifica que se pueda identificar una sesión, validar el token,
 * recuperar al usuario y controlar su estado y permisos.
 *
 * Las consultas a la base de datos se simulan para probar el
 * comportamiento sin depender de MongoDB.
 */

import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

// Se configura el secreto antes de importar los módulos que lo utilizan.
const JWT_SECRET_TEST = "secreto-de-prueba-para-auth";
process.env.JWT_SECRET = JWT_SECRET_TEST;
process.env.JWT_EXPIRES_IN = "1h";

const { default: Usuario } = await import("../../../models/usuarioModel.js");
const { ESTADOS_USUARIO, ROLES_USUARIO } = await import("../../../models/usuarioModel.js");
const { generarToken } = await import("../../../utils/jwt.js");
const { autenticar, autorizar } = await import("../../../middlewares/auth.js");

/**
 * Ejecuta autenticar con una respuesta simulada y reemplaza
 * la consulta al modelo para no necesitar una base de datos.
 */
async function ejecutarAutenticar(t, { cookies, usuario, errorConsulta } = {}) {
  const req = { cookies };

  const res = {
    statusCode: 200,
    datos: null,

    status(codigo) {
      this.statusCode = codigo;
      return this;
    },

    json(datos) {
      this.datos = datos;
      return this;
    },
  };

  const consulta = t.mock.method(Usuario, "obtenerPorId", async () => {
    if (errorConsulta) throw errorConsulta;
    return usuario ?? null;
  });

  const resultado = await new Promise((resolve) => {
    const next = (error) => resolve({ tipo: "next", error });

    res.json = (datos) => {
      res.datos = datos;
      resolve({ tipo: "respuesta" });
      return res;
    };

    autenticar(req, res, next);
  });

  return { req, res, resultado, consulta };
}

test("responde 401 cuando no hay cookie de sesión", async (t) => {
  const { res, consulta } = await ejecutarAutenticar(t);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.datos, { error: "No hay sesión iniciada" });
  assert.equal(consulta.mock.calls.length, 0);
});

test("responde 401 cuando el token es inválido", async (t) => {
  const { res, consulta } = await ejecutarAutenticar(t, {
    cookies: { token: "esto-no-es-un-jwt" },
  });

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.datos, { error: "Token inválido o expirado" });
  assert.equal(consulta.mock.calls.length, 0);
});

test("responde 401 cuando el token no contiene un ID de usuario", async (t) => {
  const token = jwt.sign({ rol: ROLES_USUARIO.CLIENTE }, JWT_SECRET_TEST);

  const { res, consulta } = await ejecutarAutenticar(t, {
    cookies: { token },
  });

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.datos, { error: "Token inválido o expirado" });
  assert.equal(consulta.mock.calls.length, 0);
});

test("responde 401 cuando el usuario del token no existe", async (t) => {
  const token = generarToken({
    id: "usuario-123",
    rol: ROLES_USUARIO.CLIENTE,
  });

  const { res, consulta } = await ejecutarAutenticar(t, {
    cookies: { token },
  });

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.datos, { error: "Usuario no encontrado" });
  assert.equal(consulta.mock.calls.length, 1);
  assert.equal(consulta.mock.calls[0].arguments[0], "usuario-123");
});

test("responde 403 cuando el usuario existe pero está inactivo", async (t) => {
  const token = generarToken({
    id: "usuario-123",
    rol: ROLES_USUARIO.CLIENTE,
  });

  const usuario = {
    id: "usuario-123",
    estado: ESTADOS_USUARIO.INACTIVO,
    rol: ROLES_USUARIO.CLIENTE,
  };

  const { res } = await ejecutarAutenticar(t, {
    cookies: { token },
    usuario,
  });

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.datos, {
    error: "El usuario se encuentra inactivo",
  });
});

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

test("deriva a next el error cuando falla la consulta del usuario", async (t) => {
  const token = generarToken({
    id: "usuario-123",
    rol: ROLES_USUARIO.CLIENTE,
  });

  const error = new Error("Error de conexión a la base de datos");

  const { resultado } = await ejecutarAutenticar(t, {
    cookies: { token },
    errorConsulta: error,
  });

  assert.equal(resultado.tipo, "next");
  assert.equal(resultado.error, error);
});

test("responde 401 cuando se intenta autorizar sin un usuario autenticado", () => {
  const req = {};
  const res = {
    statusCode: 200,
    datos: null,

    status(codigo) {
      this.statusCode = codigo;
      return this;
    },

    json(datos) {
      this.datos = datos;
      return this;
    },
  };

  let continuo = false;
  const next = () => {
    continuo = true;
  };

  autorizar(ROLES_USUARIO.ADMIN)(req, res, next);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.datos, { error: "No hay sesión iniciada" });
  assert.equal(continuo, false);
});

test("responde 403 cuando el rol del usuario no está permitido", () => {
  const req = {
    usuario: { rol: ROLES_USUARIO.CLIENTE },
  };

  const res = {
    statusCode: 200,
    datos: null,

    status(codigo) {
      this.statusCode = codigo;
      return this;
    },

    json(datos) {
      this.datos = datos;
      return this;
    },
  };

  let continuo = false;
  const next = () => {
    continuo = true;
  };

  autorizar(ROLES_USUARIO.ADMIN)(req, res, next);

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.datos, {
    error: "No tenés permiso para realizar esta acción",
  });
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

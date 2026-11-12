import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

const JWT_SECRET_TEST = "secreto-para-tests-de-authService";
process.env.JWT_SECRET = JWT_SECRET_TEST;
process.env.JWT_EXPIRES_IN = "1h";

const { default: Usuario } = await import("../../../models/usuarioModel.js");
const { ESTADOS_USUARIO, ROLES_USUARIO } = await import("../../../models/usuarioModel.js");
const { generarToken } = await import("../../../utils/jwt.js");
const { obtenerUsuarioDesdeToken } = await import("../../../services/authService.js");
const { UnauthorizedError, ForbiddenError } = await import("../../../errors/errores.js");

const mockUsuario = (t, usuario) => t.mock.method(Usuario, "obtenerPorId", async () => usuario);

test("lanza UnauthorizedError si no se recibe token", async () => {
  await assert.rejects(obtenerUsuarioDesdeToken(null), UnauthorizedError);
  await assert.rejects(obtenerUsuarioDesdeToken(undefined), UnauthorizedError);
  await assert.rejects(obtenerUsuarioDesdeToken(""), UnauthorizedError);
});

test("lanza UnauthorizedError si el token es inválido", async () => {
  await assert.rejects(obtenerUsuarioDesdeToken("no-es-un-jwt"), UnauthorizedError);
});

test("lanza UnauthorizedError si el token no contiene id", async (t) => {
  const token = jwt.sign({ rol: ROLES_USUARIO.CLIENTE }, JWT_SECRET_TEST);
  await assert.rejects(obtenerUsuarioDesdeToken(token), UnauthorizedError);
});

test("lanza UnauthorizedError si el usuario no existe", async (t) => {
  mockUsuario(t, null);
  const token = generarToken({ id: "000000000000000000000001", rol: ROLES_USUARIO.CLIENTE });

  await assert.rejects(obtenerUsuarioDesdeToken(token), UnauthorizedError);
});

test("lanza ForbiddenError si el usuario está inactivo", async (t) => {
  mockUsuario(t, { id: "123", estado: ESTADOS_USUARIO.INACTIVO, rol: ROLES_USUARIO.CLIENTE });
  const token = generarToken({ id: "123", rol: ROLES_USUARIO.CLIENTE });

  await assert.rejects(obtenerUsuarioDesdeToken(token), ForbiddenError);
});

test("devuelve el usuario y la expiración cuando el token es válido", async (t) => {
  const usuario = { id: "123", estado: ESTADOS_USUARIO.ACTIVO, rol: ROLES_USUARIO.CLIENTE };
  mockUsuario(t, usuario);
  const token = generarToken({ id: "123", rol: ROLES_USUARIO.CLIENTE });

  const resultado = await obtenerUsuarioDesdeToken(token);

  assert.strictEqual(resultado.usuario, usuario);
  assert.ok(typeof resultado.expiraEn === "number");
  assert.ok(resultado.expiraEn > Date.now());
});
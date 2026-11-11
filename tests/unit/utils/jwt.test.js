import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { spawnSync } from "node:child_process";

const JWT_SECRET_TEST = "clave-secreta-exclusiva-para-tests";

// Configuración previa a la importación del módulo bajo prueba.
process.env.JWT_SECRET = JWT_SECRET_TEST;
process.env.JWT_EXPIRES_IN = "2h";

const { generarToken, verificarToken } = await import("../../../utils/jwt.js");

const rutaModulo = new URL("../../../utils/jwt.js", import.meta.url).href;

/**
 * Ejecuta una importación aislada del módulo con otras variables
 * de entorno, sin afectar al proceso que ejecuta estos tests.
 */
const ejecutarProceso = (codigo, variables = {}) => {
  const env = { ...process.env };

  delete env.JWT_SECRET;
  delete env.JWT_EXPIRES_IN;

  Object.assign(env, variables);

  return spawnSync(process.execPath, ["--input-type=module", "-e", codigo], {
    encoding: "utf8",
    env: {
      ...env,
      NO_COLOR: "1",
      FORCE_COLOR: "0",
    },
  });
};

test("no permite importar el módulo cuando falta JWT_SECRET", () => {
  const resultado = ejecutarProceso(`
    await import(${JSON.stringify(rutaModulo)});
  `);

  assert.notEqual(resultado.status, 0);
  assert.match(resultado.stderr, /La variable JWT_SECRET no está definida/);
});

test("genera un token firmado con el ID y rol del usuario", () => {
  const usuario = {
    id: "usuario-123",
    rol: "cliente",
    nombre: "Ana",
    email: "ana@example.test",
    password: "hash-secreto",
  };

  const token = generarToken(usuario);
  const payload = jwt.verify(token, JWT_SECRET_TEST);

  assert.equal(typeof token, "string");
  assert.equal(payload.id, usuario.id);
  assert.equal(payload.rol, usuario.rol);
});

test("incluye solamente los datos necesarios en el payload", () => {
  const usuario = {
    id: "usuario-123",
    rol: "cliente",
    nombre: "Ana",
    email: "ana@example.test",
    password: "hash-secreto",
  };

  const token = generarToken(usuario);
  const payload = jwt.verify(token, JWT_SECRET_TEST);

  assert.deepEqual(Object.keys(payload).sort(), ["exp", "iat", "id", "rol"]);

  assert.equal("password" in payload, false);
  assert.equal("email" in payload, false);
  assert.equal("nombre" in payload, false);
});

test("prioriza usuario.id cuando también existe usuario._id", () => {
  const usuario = {
    id: "id-publico",
    _id: "id-base-datos",
    rol: "admin",
  };

  const token = generarToken(usuario);
  const payload = jwt.verify(token, JWT_SECRET_TEST);

  assert.equal(payload.id, "id-publico");
});

test("utiliza usuario._id.toString() cuando no existe usuario.id", () => {
  const usuario = {
    _id: {
      toString: () => "id-base-datos",
    },
    rol: "cliente",
  };

  const token = generarToken(usuario);
  const payload = jwt.verify(token, JWT_SECRET_TEST);

  assert.equal(payload.id, "id-base-datos");
});

test("respeta el tiempo de expiración configurado", () => {
  const token = generarToken({
    id: "usuario-123",
    rol: "cliente",
  });

  const payload = jwt.verify(token, JWT_SECRET_TEST);

  assert.equal(payload.exp - payload.iat, 7200);
});

test("utiliza una hora de expiración cuando no se configura JWT_EXPIRES_IN", () => {
  const resultado = ejecutarProceso(
    `
      import jwt from "jsonwebtoken";

      const { generarToken } = await import(
        ${JSON.stringify(rutaModulo)}
      );

      const token = generarToken({
        id: "usuario-123",
        rol: "cliente",
      });

      const payload = jwt.decode(token);

      console.log(payload.exp - payload.iat);
    `,
    { JWT_SECRET: JWT_SECRET_TEST },
  );

  assert.equal(resultado.status, 0, resultado.stderr);
  assert.equal(resultado.stdout.trim(), "3600");
});

test("verifica un token válido y devuelve su payload", () => {
  const token = generarToken({
    id: "usuario-123",
    rol: "admin",
  });

  const payload = verificarToken(token);

  assert.ok(payload);
  assert.equal(payload.id, "usuario-123");
  assert.equal(payload.rol, "admin");
});

test("devuelve null cuando el token tiene una firma incorrecta", () => {
  const token = jwt.sign({ id: "usuario-123", rol: "cliente" }, "otra-clave-secreta", {
    expiresIn: "1h",
  });

  assert.equal(verificarToken(token), null);
});

test("devuelve null cuando el token está malformado", () => {
  assert.equal(verificarToken("esto-no-es-un-jwt"), null);
});

test("devuelve null cuando el token está expirado", () => {
  const token = jwt.sign({ id: "usuario-123", rol: "cliente" }, JWT_SECRET_TEST, {
    expiresIn: "-1s",
  });

  assert.equal(verificarToken(token), null);
});

test("devuelve null cuando el token todavía no es válido", () => {
  const token = jwt.sign({ id: "usuario-123", rol: "cliente" }, JWT_SECRET_TEST, {
    notBefore: "1h",
  });

  assert.equal(verificarToken(token), null);
});

test("devuelve null cuando no se proporciona un token", () => {
  assert.equal(verificarToken(undefined), null);
  assert.equal(verificarToken(null), null);
  assert.equal(verificarToken(""), null);
});

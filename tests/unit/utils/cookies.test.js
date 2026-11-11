import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

import {
  NOMBRE_COOKIE,
  opcionesCookie,
  setearCookieToken,
  limpiarCookieToken,
  leerCookieToken,
} from "../../../utils/cookies.js";

const rutaModulo = new URL("../../../utils/cookies.js", import.meta.url).href;

const ejecutarProceso = (nodeEnv) => {
  return spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
        const { opcionesCookie } = await import(
          ${JSON.stringify(rutaModulo)}
        );

        console.log(opcionesCookie.secure);
      `,
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_ENV: nodeEnv,
        NO_COLOR: "1",
        FORCE_COLOR: "0",
      },
    },
  );
};

test("define el nombre de la cookie como token", () => {
  assert.equal(NOMBRE_COOKIE, "token");
});

test("configura la cookie como httpOnly", () => {
  assert.equal(opcionesCookie.httpOnly, true);
});

test("configura sameSite como lax", () => {
  assert.equal(opcionesCookie.sameSite, "lax");
});

test("habilita secure cuando el entorno es producción", () => {
  const resultado = ejecutarProceso("production");

  assert.equal(resultado.status, 0, resultado.stderr);
  assert.equal(resultado.stdout.trim(), "true");
});

test("deshabilita secure cuando el entorno no es producción", () => {
  const resultado = ejecutarProceso("development");

  assert.equal(resultado.status, 0, resultado.stderr);
  assert.equal(resultado.stdout.trim(), "false");
});

test("establece una duración de una hora", () => {
  assert.equal(opcionesCookie.maxAge, 60 * 60 * 1000);
});

test("setea la cookie con el nombre, token y opciones configuradas", () => {
  const llamadas = [];
  const res = {
    cookie: (...args) => llamadas.push(args),
  };

  setearCookieToken(res, "token-de-prueba");

  assert.equal(llamadas.length, 1);
  assert.deepEqual(llamadas[0], [NOMBRE_COOKIE, "token-de-prueba", opcionesCookie]);
});

test("lee el token cuando existe en las cookies de la petición", () => {
  const req = {
    cookies: {
      token: "token-de-prueba",
    },
  };

  assert.equal(leerCookieToken(req), "token-de-prueba");
});

test("devuelve null cuando no existen cookies en la petición", () => {
  assert.equal(leerCookieToken({}), null);
});

test("devuelve null cuando no existe la cookie token", () => {
  const req = {
    cookies: {
      otraCookie: "otro-valor",
    },
  };

  assert.equal(leerCookieToken(req), null);
});

test("devuelve null cuando el valor de la cookie está vacío", () => {
  const req = {
    cookies: {
      token: "",
    },
  };

  assert.equal(leerCookieToken(req), null);
});

test("configura la cookie para estar disponible en toda la aplicación", () => {
  const llamadas = [];
  const res = {
    cookie: (...args) => llamadas.push(args),
  };

  setearCookieToken(res, "token-de-prueba");

  assert.equal(llamadas[0][2].path, "/");
});

test("limpia la cookie utilizando su nombre y la ruta configurada", () => {
  const llamadas = [];
  const res = {
    clearCookie: (...args) => llamadas.push(args),
  };

  limpiarCookieToken(res);

  assert.deepEqual(llamadas, [[NOMBRE_COOKIE, { path: "/" }]]);
});

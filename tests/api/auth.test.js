
import test, { before, after, describe } from "node:test";
import assert from "node:assert/strict";

import {
  iniciarEntorno,
  cerrarEntorno,
  peticion,
  respuestaJSON,
  crearUsuario,
  Usuario,
  crearSesion,
} from "../helpers/environment.js";

import {
  ESTADOS_USUARIO,
  ROLES_USUARIO,
} from "../../definitions/usuario.js";

before(iniciarEntorno);
after(cerrarEntorno);

// Obtiene la cookie token de una respuesta HTTP.
function obtenerCookie(response) {
  const cookies =
    response.headers.getSetCookie?.() ??
    [response.headers.get("set-cookie")].filter(Boolean);

  return cookies.find((cookie) => cookie.startsWith("token="));
}

// -----------------------------------------------------------------------------
// POST /usuarios/login - Inicio de sesión
// -----------------------------------------------------------------------------

describe("POST /usuarios/login - inicio de sesión", () => {
  test("inicia sesión con credenciales válidas y establece la cookie", async () => {
    const usuario = await crearUsuario();

    const response = await peticion("/usuarios/login", {
      method: "POST",
      body: {
        email: usuario.email,
        password: "clave-prueba",
      },
    });

    const body = await respuestaJSON(response);
    const cookie = obtenerCookie(response);

    assert.equal(response.status, 200);
    assert.equal(body.mensaje, "Inicio de sesión exitoso");
    assert.equal(body.usuario.id, usuario.id);
    assert.equal("password" in body.usuario, false);

    assert.ok(cookie);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Lax/i);
    assert.match(cookie, /Path=\//i);
    assert.match(cookie, /Max-Age=3600/i);
  });

  test("rechaza una contraseña incorrecta", async () => {
    const usuario = await crearUsuario();

    const response = await peticion("/usuarios/login", {
      method: "POST",
      body: {
        email: usuario.email,
        password: "contraseña-incorrecta",
      },
    });

    assert.equal(response.status, 401);
    assert.equal(obtenerCookie(response), undefined);
  });

  test("rechaza un email inexistente", async () => {
    const response = await peticion("/usuarios/login", {
      method: "POST",
      body: {
        email: "inexistente@example.test",
        password: "clave-prueba",
      },
    });

    assert.equal(response.status, 401);
    assert.equal(obtenerCookie(response), undefined);
  });

  test("impide iniciar sesión a un usuario inactivo", async () => {
    const usuario = await crearUsuario({
      estado: ESTADOS_USUARIO.INACTIVO,
    });

    const response = await peticion("/usuarios/login", {
      method: "POST",
      body: {
        email: usuario.email,
        password: "clave-prueba",
      },
    });

    assert.equal(response.status, 403);
    assert.equal(obtenerCookie(response), undefined);
  });
});

// -----------------------------------------------------------------------------
// Registro → Login - Integración del flujo de autenticación
// -----------------------------------------------------------------------------

describe("Flujo de registro e inicio de sesión", () => {
  test("permite registrar un usuario e iniciar sesión con sus credenciales", async () => {
    const email = `registro-${Date.now()}-${Math.random()}@example.test`;
    const password = "clave-prueba";

    // Registro mediante el endpoint público.
    const registro = await peticion("/usuarios", {
      method: "POST",
      body: {
        nombre: "Usuario",
        apellido: "Integracion",
        email,
        telefono: "1122334455",
        password,
      },
    });

    assert.equal(registro.status, 201);

    // Login con las credenciales utilizadas en el registro.
    const login = await peticion("/usuarios/login", {
      method: "POST",
      body: {
        email,
        password,
      },
    });

    const body = await respuestaJSON(login);
    const cookie = obtenerCookie(login);

    assert.equal(login.status, 200);
    assert.equal(body.mensaje, "Inicio de sesión exitoso");
    assert.equal(body.usuario.email, email);
    assert.equal("password" in body.usuario, false);

    assert.ok(cookie);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Lax/i);
    assert.match(cookie, /Path=\//i);
  });
});

// -----------------------------------------------------------------------------
// POST /usuarios/logout - Cierre de sesión
// -----------------------------------------------------------------------------

describe("POST /usuarios/logout - cierre de sesión", () => {
  test("cierra la sesión y limpia la cookie", async () => {
    const usuario = await crearUsuario();
    const headers = crearSesion(usuario);

    const response = await peticion("/usuarios/logout", {
      method: "POST",
      headers,
    });

    const body = await respuestaJSON(response);
    const cookie = obtenerCookie(response);

    assert.equal(response.status, 200);
    assert.equal(body.mensaje, "Sesión cerrada correctamente");

    assert.ok(cookie);
    assert.match(cookie, /^token=;/);
    assert.match(cookie, /Path=\//i);

    // La cookie devuelta por logout ya no contiene el token de sesión.
    assert.doesNotMatch(cookie, /Max-Age=3600/i);
  });

  test("rechaza el cierre de sesión sin autenticación", async () => {
    const response = await peticion("/usuarios/logout", {
      method: "POST",
    });

    assert.equal(response.status, 401);
  });
});

// -----------------------------------------------------------------------------
// Middleware autenticar - Verificación de sesión
// -----------------------------------------------------------------------------

describe("Middleware de autenticación", () => {
  test("rechaza una cookie con un token inválido", async () => {
    const response = await peticion("/usuarios", {
      headers: {
        Cookie: "token=token-invalido",
      },
    });

    assert.equal(response.status, 401);
  });

  test("rechaza una sesión cuando el usuario fue desactivado", async () => {
    const usuario = await crearUsuario();
    const headers = crearSesion(usuario);

    // La sesión se genera cuando el usuario todavía está activo.
    await Usuario.updateOne(
      { _id: usuario._id },
      { $set: { estado: ESTADOS_USUARIO.INACTIVO } },
    );

    const response = await peticion("/usuarios", { headers });

    assert.equal(response.status, 403);
  });

  test("permite acceder con una sesión válida de administrador", async () => {
    const admin = await crearUsuario({
      rol: ROLES_USUARIO.ADMIN,
    });

    const headers = crearSesion(admin);

    const response = await peticion("/usuarios", { headers });

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(await respuestaJSON(response)));
  });
});

import test, { before, after, describe } from "node:test";
import assert from "node:assert/strict";

import {
  iniciarEntorno,
  cerrarEntorno,
  peticion,
  crearUsuario,
  crearSesion,
} from "../helpers/environment.js";

before(iniciarEntorno);
after(cerrarEntorno);

describe("GET /vistas/inicio - visitante", () => {
  test("muestra la bienvenida y la invitación a ingresar, sin el chat", async () => {
    const response = await peticion("/vistas/inicio");
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /Te damos la bienvenida a Urbana Cult/);
    assert.match(html, /href="\/vistas\/login"/);
    assert.match(html, /href="\/vistas\/registro"/);
    assert.match(html, /Iniciar sesión/);
    assert.match(html, /Registrarse/);

    assert.doesNotMatch(html, /Chat comunitario/);
    assert.doesNotMatch(html, /id="chat"/);
    assert.doesNotMatch(html, /id="chat-formulario"/);
    assert.doesNotMatch(html, /\/socket\.io\/socket\.io\.js/);
    assert.doesNotMatch(html, /\/js\/chat\.js/);
  });

  test("no muestra los módulos en la barra de navegación", async () => {
    const response = await peticion("/vistas/inicio");
    const html = await response.text();

    for (const ruta of ["eventos", "reservas", "entradas", "usuarios", "salas"]) {
      assert.doesNotMatch(html, new RegExp(`href="/vistas/${ruta}"`), ruta);
    }
  });
});

describe("GET /vistas/inicio - usuario autenticado", () => {
  test("muestra la bienvenida, la sesión y el chat", async () => {
    const usuario = await crearUsuario();

    const response = await peticion("/vistas/inicio", {
      headers: crearSesion(usuario),
    });

    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /Te damos la bienvenida a Urbana Cult/);
    assert.match(html, /Cerrar sesión/);
    assert.doesNotMatch(html, /href="\/vistas\/registro"/);

    assert.match(html, /Chat comunitario/);
    assert.match(html, /id="chat"/);
    assert.match(html, /id="chat-mensajes"/);
    assert.match(html, /id="chat-formulario"/);
    assert.match(html, /maxlength="500"/);
    assert.match(html, /id="chat-gemini-estado"/);
    assert.match(html, /id="chat-reconectar"/);
    assert.match(html, /\/socket\.io\/socket\.io\.js/);
    assert.match(html, /\/js\/chat\.js/);
  });

  test("un cliente ve en la barra solo los módulos que le corresponden", async () => {
    const usuario = await crearUsuario();

    const response = await peticion("/vistas/inicio", {
      headers: crearSesion(usuario),
    });

    const html = await response.text();

    for (const ruta of ["eventos", "reservas", "entradas"]) {
      assert.match(html, new RegExp(`href="/vistas/${ruta}"`), ruta);
    }

    for (const ruta of ["usuarios", "salas"]) {
      assert.doesNotMatch(html, new RegExp(`href="/vistas/${ruta}"`), ruta);
    }
  });
});

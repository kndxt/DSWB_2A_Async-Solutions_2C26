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

describe("GET /vistas/inicio", () => {
  test("renderiza el inicio para un usuario autenticado", async () => {
    const usuario = await crearUsuario();

    const response = await peticion("/vistas/inicio", {
      headers: crearSesion(usuario),
    });

    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /Menú principal/);
    assert.match(html, /Cerrar sesión/);
  });

  test("renderiza el inicio para un usuario anónimo", async () => {
    const response = await peticion("/vistas/inicio");
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /Menú principal/);
    assert.match(html, /Iniciar sesión/);
  });
});

describe("GET /vistas/chat-prueba", () => {
  test("renderiza el chat para un usuario autenticado", async () => {
    const usuario = await crearUsuario();

    const response = await peticion("/vistas/chat-prueba", {
      headers: crearSesion(usuario),
    });

    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /Chat comunitario/);
    assert.match(html, /id="chat"/);
    assert.match(html, /id="chat-mensajes"/);
    assert.match(html, /id="chat-formulario"/);
    assert.match(html, /maxlength="500"/);
    assert.match(html, /\/socket\.io\/socket\.io\.js/);
    assert.match(html, /\/js\/chat\.js/);
  });

  test("muestra el acceso al login sin renderizar el chat para un usuario anónimo", async () => {
    const response = await peticion("/vistas/chat-prueba");
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /Chat comunitario/);
    assert.match(html, /Iniciá sesión para participar/);
    assert.match(html, /href="\/vistas\/login"/);
    assert.doesNotMatch(html, /id="chat"/);
    assert.doesNotMatch(html, /id="chat-formulario"/);
  });
});

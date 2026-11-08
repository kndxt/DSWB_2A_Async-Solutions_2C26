import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { iniciarEntorno, cerrarEntorno, peticion, crearUsuario } from "../helpers/environment.js";

before(iniciarEntorno);
after(cerrarEntorno);

test("validarIds rechaza identificadores con formato inválido antes del controller", async () => {
  const response = await peticion("/usuarios/no-es-un-objectid");
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.match(body.error, /identificador/i);
});

test("validarIds permite ObjectIds válidos para que el controller resuelva existencia", async () => {
  const usuario = await crearUsuario();
  const response = await peticion(`/usuarios/${usuario.id}`);
  assert.equal(response.status, 200);
});

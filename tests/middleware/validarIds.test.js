import test, { before, after } from "node:test";
import assert from "node:assert/strict";

import {
  iniciarEntorno,
  cerrarEntorno,
  peticion,
  crearUsuario,
  crearSesion,
} from "../helpers/environment.js";

import { ROLES_USUARIO } from "../../models/usuarioModel.js";

before(iniciarEntorno);
after(cerrarEntorno);

// ---------------------------------------------------------------
// validarIds: parámetros de ruta
// ---------------------------------------------------------------

test("rechaza identificadores con formato inválido antes del controller", async () => {
  const admin = await crearUsuario({
    rol: ROLES_USUARIO.ADMIN,
  });

  const response = await peticion("/usuarios/no-es-un-objectid", {
    headers: crearSesion(admin),
  });

  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.error, /identificador/i);
});

test("permite ObjectIds válidos para que el controller resuelva existencia", async () => {
  const admin = await crearUsuario({
    rol: ROLES_USUARIO.ADMIN,
  });

  const usuario = await crearUsuario();

  const response = await peticion(`/usuarios/${usuario.id}`, {
    headers: crearSesion(admin),
  });

  assert.equal(response.status, 200);
});

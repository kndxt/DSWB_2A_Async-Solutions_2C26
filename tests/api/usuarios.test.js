import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import {
  iniciarEntorno,
  cerrarEntorno,
  peticion,
  respuestaJSON,
  crearUsuario,
  registrarCreado,
  Usuario,
} from "../helpers/environment.js";

before(iniciarEntorno);
after(cerrarEntorno);

test("GET /usuarios devuelve un array JSON", async () => {
  const response = await peticion("/usuarios");
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(await respuestaJSON(response)));
});

test("GET /usuarios/:id devuelve el usuario y no expone password", async () => {
  const usuario = await crearUsuario();
  const response = await peticion(`/usuarios/${usuario.id}`);
  const body = await respuestaJSON(response);
  assert.equal(response.status, 200);
  assert.equal(body.id, usuario.id);
  assert.equal(body.email, usuario.email);
  assert.equal("password" in body, false);
});

test("GET /usuarios/:id distingue ID inválido y usuario inexistente", async () => {
  const invalido = await peticion("/usuarios/no-es-un-id");
  const inexistente = await peticion("/usuarios/000000000000000000000001");
  assert.equal(invalido.status, 400);
  assert.equal(inexistente.status, 404);
});

test("POST /usuarios crea un usuario válido", async () => {
  const email = `post_${Date.now()}@example.test`;
  const response = await peticion("/usuarios", {
    method: "POST",
    body: { nombre: "Ana", apellido: "Prueba", email, password: "123456" },
  });
  const body = await respuestaJSON(response);
  assert.equal(response.status, 201);
  assert.equal(body.email, email);
  assert.equal("password" in body, false);
  const creado = await Usuario.findById(body.id);
  registrarCreado(Usuario, creado);
});

test("POST /usuarios rechaza campos obligatorios faltantes y email duplicado", async () => {
  const faltante = await peticion("/usuarios", {
    method: "POST",
    body: { nombre: "Ana", apellido: "Prueba", email: "sin-password@example.test" },
  });
  const usuario = await crearUsuario();
  const duplicado = await peticion("/usuarios", {
    method: "POST",
    body: { nombre: "Otro", apellido: "Usuario", email: usuario.email, password: "123456" },
  });
  assert.equal(faltante.status, 400);
  assert.equal(duplicado.status, 400);
  assert.match((await respuestaJSON(duplicado)).error, /email/i);
});

test("PUT /usuarios/:id actualiza campos permitidos e ignora estado e ID", async () => {
  const usuario = await crearUsuario();
  const response = await peticion(`/usuarios/${usuario.id}`, {
    method: "PUT",
    body: {
      nombre: "Nombre actualizado",
      telefono: "1199999999",
      estado: "inactivo",
      id: "000000000000000000000001",
    },
  });
  const body = await respuestaJSON(response);
  assert.equal(response.status, 200);
  assert.equal(body.nombre, "Nombre actualizado");
  assert.equal(body.estado, "activo");
  assert.equal(body.id, usuario.id);
});

test("PUT /usuarios/:id rechaza email duplicado, contraseña vacía e ID inexistente", async () => {
  const [usuario, otro] = await Promise.all([crearUsuario(), crearUsuario()]);
  const emailDuplicado = await peticion(`/usuarios/${usuario.id}`, {
    method: "PUT",
    body: { email: otro.email },
  });
  const passwordVacia = await peticion(`/usuarios/${usuario.id}`, {
    method: "PUT",
    body: { password: "" },
  });
  const inexistente = await peticion("/usuarios/000000000000000000000001", {
    method: "PUT",
    body: { nombre: "X" },
  });
  assert.equal(emailDuplicado.status, 400);
  assert.equal(passwordVacia.status, 400);
  assert.equal(inexistente.status, 404);
});

test("PUT /usuarios/:id permite actualmente cambiar la contraseña por un valor no vacío", async () => {
  const usuario = await crearUsuario();
  const response = await peticion(`/usuarios/${usuario.id}`, {
    method: "PUT",
    body: { password: "nueva-clave" },
  });
  assert.equal(response.status, 200);
  assert.equal((await Usuario.findById(usuario.id)).password, "nueva-clave");
});

test("PATCH /usuarios/:id/estado cambia estado y rechaza valores inválidos", async () => {
  const usuario = await crearUsuario();
  const actualizado = await peticion(`/usuarios/${usuario.id}/estado`, {
    method: "PATCH",
    body: { estado: "inactivo", nombre: "No modificar" },
  });
  const invalido = await peticion(`/usuarios/${usuario.id}/estado`, {
    method: "PATCH",
    body: { estado: "bloqueado" },
  });
  const body = await respuestaJSON(actualizado);
  assert.equal(actualizado.status, 200);
  assert.equal(body.estado, "inactivo");
  assert.equal(body.nombre, "Usuario");
  assert.equal(invalido.status, 400);
});

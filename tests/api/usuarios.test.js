import test, { before, after, describe } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import {
  iniciarEntorno,
  cerrarEntorno,
  peticion,
  respuestaJSON,
  crearUsuario,
  registrarCreado,
  Usuario,
  crearSesion,
} from "../helpers/environment.js";
import { ROLES_USUARIO } from "../../definitions/usuario.js";

before(iniciarEntorno);
after(cerrarEntorno);

// Helpers para probar las rutas protegidas con sesiones reales.
async function sesionAdmin() {
  const usuario = await crearUsuario({ rol: ROLES_USUARIO.ADMIN });
  return crearSesion(usuario);
}

async function sesionCliente() {
  const usuario = await crearUsuario({ rol: ROLES_USUARIO.CLIENTE });
  return crearSesion(usuario);
}

// -----------------------------------------------------------------------------
// GET /usuarios - Consultas
// -----------------------------------------------------------------------------

describe("GET /usuarios - consultas", () => {
  // Obtención del listado.
  test("devuelve un array JSON", async () => {
    const headers = await sesionAdmin();

    const response = await peticion("/usuarios", { headers });

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(await respuestaJSON(response)));
  });

  // Obtención individual.
  test("devuelve el usuario por ID y no expone la contraseña", async () => {
    const headers = await sesionAdmin();
    const usuario = await crearUsuario();

    const response = await peticion(`/usuarios/${usuario.id}`, { headers });
    const body = await respuestaJSON(response);

    assert.equal(response.status, 200);
    assert.equal(body.id, usuario.id);
    assert.equal(body.email, usuario.email);
    assert.equal("password" in body, false);
  });

  // Validación de identificadores.
  test("distingue ID inválido y usuario inexistente", async () => {
    const headers = await sesionAdmin();

    const invalido = await peticion("/usuarios/no-es-un-id", { headers });
    const inexistente = await peticion("/usuarios/000000000000000000000001", { headers });

    assert.equal(invalido.status, 400);
    assert.equal(inexistente.status, 404);
  });
});

// -----------------------------------------------------------------------------
// POST /usuarios - Registro
// -----------------------------------------------------------------------------

describe("POST /usuarios - registro", () => {
  // Creación exitosa.
  test("crea un usuario válido sin requerir autenticación", async () => {
    const email = `post_${Date.now()}@example.test`;

    const response = await peticion("/usuarios", {
      method: "POST",
      body: {
        nombre: "Ana",
        apellido: "Prueba",
        email,
        password: "123456",
      },
    });

    const body = await respuestaJSON(response);

    assert.equal(response.status, 201);
    assert.equal(body.email, email);
    assert.equal("password" in body, false);

    const creado = await Usuario.findById(body.id);
    registrarCreado(Usuario, creado);
  });

  // Validación de datos obligatorios y unicidad.
  test("rechaza campos obligatorios faltantes y email duplicado", async () => {
    const faltante = await peticion("/usuarios", {
      method: "POST",
      body: {
        nombre: "Ana",
        apellido: "Prueba",
        email: "sin-password@example.test",
      },
    });

    const usuario = await crearUsuario();

    const duplicado = await peticion("/usuarios", {
      method: "POST",
      body: {
        nombre: "Otro",
        apellido: "Usuario",
        email: usuario.email,
        password: "123456",
      },
    });

    assert.equal(faltante.status, 400);
    assert.equal(duplicado.status, 409);
    assert.match((await respuestaJSON(duplicado)).error, /email/i);
  });
});

// -----------------------------------------------------------------------------
// PUT /usuarios/:id - Actualización
// -----------------------------------------------------------------------------

describe("PUT /usuarios/:id - actualización", () => {
  // Actualización de campos permitidos.
  test("actualiza campos permitidos e ignora estado e ID", async () => {
    const headers = await sesionAdmin();
    const usuario = await crearUsuario();

    const response = await peticion(`/usuarios/${usuario.id}`, {
      method: "PUT",
      headers,
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

  // Conflictos y recursos inexistentes.
  test("rechaza email duplicado, contraseña vacía y usuario inexistente", async () => {
    const headers = await sesionAdmin();
    const [usuario, otro] = await Promise.all([crearUsuario(), crearUsuario()]);

    const emailDuplicado = await peticion(`/usuarios/${usuario.id}`, {
      method: "PUT",
      headers,
      body: { email: otro.email },
    });

    const passwordVacia = await peticion(`/usuarios/${usuario.id}`, {
      method: "PUT",
      headers,
      body: { password: "" },
    });

    const inexistente = await peticion("/usuarios/000000000000000000000001", {
      method: "PUT",
      headers,
      body: { nombre: "X" },
    });

    assert.equal(emailDuplicado.status, 409);
    assert.equal(passwordVacia.status, 400);
    assert.equal(inexistente.status, 404);
  });

  // La contraseña debe almacenarse como hash bcrypt.
  test("hashea la contraseña al actualizarla", async () => {
    const headers = await sesionAdmin();
    const usuario = await crearUsuario();

    const response = await peticion(`/usuarios/${usuario.id}`, {
      method: "PUT",
      headers,
      body: { password: "nueva-clave" },
    });

    assert.equal(response.status, 200);

    const guardado = await Usuario.findById(usuario.id);

    // La contraseña no se guarda en texto plano.
    assert.notEqual(guardado.password, "nueva-clave");

    // El valor almacenado tiene formato de hash bcrypt.
    assert.match(guardado.password, /^\$2[aby]\$\d{2}\$/);

    // El hash corresponde a la contraseña original.
    assert.equal(await bcrypt.compare("nueva-clave", guardado.password), true);
  });
});

// -----------------------------------------------------------------------------
// PATCH /usuarios/:id/estado - Cambio de estado
// -----------------------------------------------------------------------------

describe("PATCH /usuarios/:id/estado - cambio de estado", () => {
  // Cambio exitoso y protección de otros campos.
  test("cambia el estado e ignora otros campos enviados", async () => {
    const headers = await sesionAdmin();
    const usuario = await crearUsuario();

    const response = await peticion(`/usuarios/${usuario.id}/estado`, {
      method: "PATCH",
      headers,
      body: {
        estado: "inactivo",
        nombre: "No modificar",
        rol: ROLES_USUARIO.ADMIN,
      },
    });

    const body = await respuestaJSON(response);

    assert.equal(response.status, 200);
    assert.equal(body.estado, "inactivo");
    assert.equal(body.nombre, "Usuario");
    assert.equal(body.rol, ROLES_USUARIO.CLIENTE);
  });

  // También debe permitir reactivar usuarios.
  test("permite volver a activar un usuario inactivo", async () => {
    const headers = await sesionAdmin();
    const usuario = await crearUsuario({ estado: "inactivo" });

    const response = await peticion(`/usuarios/${usuario.id}/estado`, {
      method: "PATCH",
      headers,
      body: { estado: "activo" },
    });

    const body = await respuestaJSON(response);

    assert.equal(response.status, 200);
    assert.equal(body.estado, "activo");
  });

  // Validación de valores permitidos.
  test("rechaza valores de estado inválidos", async () => {
    const headers = await sesionAdmin();
    const usuario = await crearUsuario();

    const response = await peticion(`/usuarios/${usuario.id}/estado`, {
      method: "PATCH",
      headers,
      body: { estado: "bloqueado" },
    });

    assert.equal(response.status, 400);
  });

  // Validación de datos obligatorios.
  test("rechaza la solicitud si no se envía el estado", async () => {
    const headers = await sesionAdmin();
    const usuario = await crearUsuario();

    const response = await peticion(`/usuarios/${usuario.id}/estado`, {
      method: "PATCH",
      headers,
      body: {},
    });

    assert.equal(response.status, 400);
  });

  // Validación de identificadores y existencia.
  test("distingue ID inválido y usuario inexistente", async () => {
    const headers = await sesionAdmin();

    const invalido = await peticion("/usuarios/no-es-un-id/estado", {
      method: "PATCH",
      headers,
      body: { estado: "inactivo" },
    });

    const inexistente = await peticion(
      "/usuarios/000000000000000000000001/estado",
      {
        method: "PATCH",
        headers,
        body: { estado: "inactivo" },
      },
    );

    assert.equal(invalido.status, 400);
    assert.equal(inexistente.status, 404);
  });
});

// -----------------------------------------------------------------------------
// PATCH /usuarios/:id/rol - Cambio de rol
// -----------------------------------------------------------------------------

describe("PATCH /usuarios/:id/rol - cambio de rol", () => {
  // Cambio de cliente a administrador.
  test("permite cambiar un cliente a administrador", async () => {
    const headers = await sesionAdmin();
    const usuario = await crearUsuario({ rol: ROLES_USUARIO.CLIENTE });

    const response = await peticion(`/usuarios/${usuario.id}/rol`, {
      method: "PATCH",
      headers,
      body: { rol: ROLES_USUARIO.ADMIN },
    });

    const body = await respuestaJSON(response);

    assert.equal(response.status, 200);
    assert.equal(body.rol, ROLES_USUARIO.ADMIN);
    assert.equal(body.email, usuario.email);
  });

  // Cambio de administrador a cliente.
  test("permite cambiar un administrador a cliente", async () => {
    const headers = await sesionAdmin();
    const usuario = await crearUsuario({ rol: ROLES_USUARIO.ADMIN });

    const response = await peticion(`/usuarios/${usuario.id}/rol`, {
      method: "PATCH",
      headers,
      body: { rol: ROLES_USUARIO.CLIENTE },
    });

    const body = await respuestaJSON(response);

    assert.equal(response.status, 200);
    assert.equal(body.rol, ROLES_USUARIO.CLIENTE);
  });

  // Validación de valores permitidos.
  test("rechaza valores de rol inválidos", async () => {
    const headers = await sesionAdmin();
    const usuario = await crearUsuario();

    const response = await peticion(`/usuarios/${usuario.id}/rol`, {
      method: "PATCH",
      headers,
      body: { rol: "superadmin" },
    });

    assert.equal(response.status, 400);
  });

  // Validación de datos obligatorios.
  test("rechaza la solicitud si no se envía el rol", async () => {
    const headers = await sesionAdmin();
    const usuario = await crearUsuario();

    const response = await peticion(`/usuarios/${usuario.id}/rol`, {
      method: "PATCH",
      headers,
      body: {},
    });

    assert.equal(response.status, 400);
  });

  // Validación de identificadores y existencia.
  test("distingue ID inválido y usuario inexistente", async () => {
    const headers = await sesionAdmin();

    const invalido = await peticion("/usuarios/no-es-un-id/rol", {
      method: "PATCH",
      headers,
      body: { rol: ROLES_USUARIO.ADMIN },
    });

    const inexistente = await peticion(
      "/usuarios/000000000000000000000001/rol",
      {
        method: "PATCH",
        headers,
        body: { rol: ROLES_USUARIO.ADMIN },
      },
    );

    assert.equal(invalido.status, 400);
    assert.equal(inexistente.status, 404);
  });

  // Los campos ajenos a la operación no deben modificarse.
  test("ignora otros campos enviados junto con el rol", async () => {
    const headers = await sesionAdmin();
    const usuario = await crearUsuario();

    const response = await peticion(`/usuarios/${usuario.id}/rol`, {
      method: "PATCH",
      headers,
      body: {
        rol: ROLES_USUARIO.ADMIN,
        estado: "inactivo",
        nombre: "No modificar",
      },
    });

    const body = await respuestaJSON(response);

    assert.equal(response.status, 200);
    assert.equal(body.rol, ROLES_USUARIO.ADMIN);
    assert.equal(body.estado, "activo");
    assert.equal(body.nombre, "Usuario");
  });
});

// -----------------------------------------------------------------------------
// Autenticación y autorización
// -----------------------------------------------------------------------------

describe("Autenticación y autorización de usuarios", () => {
  // Las consultas y modificaciones requieren autenticación.
  test("GET /usuarios requiere sesión", async () => {
    const response = await peticion("/usuarios");

    assert.equal(response.status, 401);
  });

  test("GET /usuarios/:id requiere sesión", async () => {
    const usuario = await crearUsuario();

    const response = await peticion(`/usuarios/${usuario.id}`);

    assert.equal(response.status, 401);
  });

  test("PUT /usuarios/:id requiere sesión", async () => {
    const usuario = await crearUsuario();

    const response = await peticion(`/usuarios/${usuario.id}`, {
      method: "PUT",
      body: { nombre: "Modificado" },
    });

    assert.equal(response.status, 401);
  });

  test("PATCH /usuarios/:id/estado requiere sesión", async () => {
    const usuario = await crearUsuario();

    const response = await peticion(`/usuarios/${usuario.id}/estado`, {
      method: "PATCH",
      body: { estado: "inactivo" },
    });

    assert.equal(response.status, 401);
  });

  // Los clientes autenticados no pueden acceder a operaciones administrativas.
  test("GET /usuarios rechaza a clientes autenticados", async () => {
    const headers = await sesionCliente();

    const response = await peticion("/usuarios", { headers });

    assert.equal(response.status, 403);
  });

  test("GET /usuarios/:id rechaza a clientes autenticados", async () => {
    const headers = await sesionCliente();
    const usuario = await crearUsuario();

    const response = await peticion(`/usuarios/${usuario.id}`, { headers });

    assert.equal(response.status, 403);
  });

  test("PUT /usuarios/:id rechaza a clientes autenticados", async () => {
    const headers = await sesionCliente();
    const usuario = await crearUsuario();

    const response = await peticion(`/usuarios/${usuario.id}`, {
      method: "PUT",
      headers,
      body: { nombre: "Modificado" },
    });

    assert.equal(response.status, 403);
  });

  test("PATCH /usuarios/:id/estado rechaza a clientes autenticados", async () => {
    const headers = await sesionCliente();
    const usuario = await crearUsuario();

    const response = await peticion(`/usuarios/${usuario.id}/estado`, {
      method: "PATCH",
      headers,
      body: { estado: "inactivo" },
    });

    assert.equal(response.status, 403);
  });

  test("PATCH /usuarios/:id/estado requiere sesión", async () => {
    const usuario = await crearUsuario();

    const response = await peticion(`/usuarios/${usuario.id}/estado`, {
      method: "PATCH",
      body: { estado: "inactivo" },
    });

    assert.equal(response.status, 401);
  });

  test("PATCH /usuarios/:id/rol requiere sesión", async () => {
    const usuario = await crearUsuario();

    const response = await peticion(`/usuarios/${usuario.id}/rol`, {
      method: "PATCH",
      body: { rol: ROLES_USUARIO.ADMIN },
    });

    assert.equal(response.status, 401);
  });

  test("PATCH /usuarios/:id/estado rechaza a clientes autenticados", async () => {
    const headers = await sesionCliente();
    const usuario = await crearUsuario();

    const response = await peticion(`/usuarios/${usuario.id}/estado`, {
      method: "PATCH",
      headers,
      body: { estado: "inactivo" },
    });

    assert.equal(response.status, 403);
  });

  test("PATCH /usuarios/:id/rol rechaza a clientes autenticados", async () => {
    const headers = await sesionCliente();
    const usuario = await crearUsuario();

    const response = await peticion(`/usuarios/${usuario.id}/rol`, {
      method: "PATCH",
      headers,
      body: { rol: ROLES_USUARIO.ADMIN },
    });

    assert.equal(response.status, 403);
  });
});

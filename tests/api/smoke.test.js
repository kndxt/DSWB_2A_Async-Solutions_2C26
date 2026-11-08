import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { iniciarEntorno, cerrarEntorno, peticion, respuestaJSON } from "../helpers/environment.js";

before(iniciarEntorno);
after(cerrarEntorno);

test("GET / redirige a la vista de inicio", async () => {
  const response = await peticion("/", { redirect: "manual" });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "/vistas/inicio");
});

test("GET a una ruta inexistente devuelve 404 JSON", async () => {
  const response = await peticion("/ruta-que-no-existe");
  const body = await respuestaJSON(response);
  assert.equal(response.status, 404);
  assert.equal(body.message, "Ruta no encontrada");
});


import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import traducirError from "../../../errors/traducirError.js";
import {
  ValidationError,
  ConflictError,
} from "../../../errors/errores.js";

// Comprueba la traducción de errores de validación de Mongoose.
test("traduce un ValidationError de Mongoose", () => {
  const errorOriginal = new mongoose.Error.ValidationError();

  const errorTraducido = traducirError(errorOriginal);

  assert.ok(errorTraducido instanceof ValidationError);
  assert.equal(errorTraducido.statusCode, 400);
  assert.equal(errorTraducido.isOperational, true);
  assert.strictEqual(errorTraducido.cause, errorOriginal);
});

// Comprueba la traducción de errores por valores duplicados.
test("traduce un error de clave duplicada de MongoDB", () => {
  const errorOriginal = new mongoose.mongo.MongoServerError({
    message: "E11000 duplicate key error",
    code: 11000,
  });

  const errorTraducido = traducirError(errorOriginal);

  assert.ok(errorTraducido instanceof ConflictError);
  assert.equal(errorTraducido.statusCode, 409);
  assert.equal(errorTraducido.isOperational, true);
  assert.strictEqual(errorTraducido.cause, errorOriginal);
});

// Comprueba que otros errores de MongoDB no se traduzcan.
test("conserva los errores de MongoDB que no sean de clave duplicada", () => {
  const errorOriginal = new mongoose.mongo.MongoServerError({
    message: "Error de MongoDB",
    code: 12345,
  });

  const errorTraducido = traducirError(errorOriginal);

  assert.strictEqual(errorTraducido, errorOriginal);
});

// Comprueba que los errores desconocidos permanezcan intactos.
test("conserva los errores que no tienen una traducción definida", () => {
  const errorOriginal = new Error("Error desconocido");

  const errorTraducido = traducirError(errorOriginal);

  assert.strictEqual(errorTraducido, errorOriginal);
});

import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import {
  obtenerTipoMongoose,
  obtenerValidadorMongoose,
} from "../../../utils/traductoresMongoose.js";

test("obtenerTipoMongoose traduce los tipos simples", () => {
  assert.equal(obtenerTipoMongoose("string"), String);
  assert.equal(obtenerTipoMongoose("number"), Number);
  assert.equal(obtenerTipoMongoose("boolean"), Boolean);
  assert.equal(obtenerTipoMongoose("date"), Date);
  assert.equal(obtenerTipoMongoose("objectId"), mongoose.Schema.Types.ObjectId);
});

test("obtenerTipoMongoose rechaza tipos no soportados", () => {
  assert.throws(() => obtenerTipoMongoose("tipoInexistente"), {
    message: "Tipo de dato no soportado: tipoInexistente",
  });
});

test("obtenerValidadorMongoose traduce la restricción de entero", () => {
  assert.equal(obtenerValidadorMongoose(true), Number.isInteger);
});

test("obtenerValidadorMongoose no devuelve un validador si no se requiere entero", () => {
  assert.equal(obtenerValidadorMongoose(false), undefined);
  assert.equal(obtenerValidadorMongoose(undefined), undefined);
});

test("el validador traducido comprueba que un número sea entero", () => {
  const validador = obtenerValidadorMongoose(true);

  assert.equal(validador(10), true);
  assert.equal(validador(10.5), false);
});

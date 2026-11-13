import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { extraerConsultaGemini } from "../../../sockets/mencionGemini.js";

describe("extraerConsultaGemini", () => {
  test("extrae una consulta cuando la mención aparece al inicio", () => {
    assert.equal(extraerConsultaGemini("@gemini Hola"), "Hola");
  });

  test("reconoce la mención sin distinguir mayúsculas", () => {
    assert.equal(extraerConsultaGemini("@GEMINI Hola"), "Hola");
    assert.equal(extraerConsultaGemini("@Gemini Hola"), "Hola");
  });

  test("extrae consultas con espacios adicionales", () => {
    assert.equal(extraerConsultaGemini("@gemini    Hola"), "Hola");
  });

  test("extrae consultas que contienen varias líneas", () => {
    assert.equal(extraerConsultaGemini("@gemini Hola\n¿Cómo estás?"), "Hola\n¿Cómo estás?");
  });

  test("devuelve null si la mención no aparece al inicio", () => {
    assert.equal(extraerConsultaGemini("Hola @gemini ¿cómo estás?"), null);
  });

  test("devuelve null si la mención forma parte de otra palabra", () => {
    assert.equal(extraerConsultaGemini("@geminis Hola"), null);
  });

  test("devuelve null si no hay una consulta después de la mención", () => {
    assert.equal(extraerConsultaGemini("@gemini"), null);
    assert.equal(extraerConsultaGemini("@gemini   "), null);
  });

  test("devuelve null si el texto no es una cadena", () => {
    assert.equal(extraerConsultaGemini(null), null);
    assert.equal(extraerConsultaGemini(undefined), null);
    assert.equal(extraerConsultaGemini(123), null);
    assert.equal(extraerConsultaGemini({ texto: "Hola" }), null);
  });
});

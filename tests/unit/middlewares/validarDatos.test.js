
import test from "node:test";
import assert from "node:assert/strict";

import validarDatos from "../../../middlewares/validarDatos.js";
import { ValidationError } from "../../../errors/errores.js";
import { entradaDefinicion } from "../../../definitions/entrada.js";
import { salaDefinicion } from "../../../definitions/sala.js";

// Configura los middlewares con las definiciones de cada entidad.
const validarEntrada = validarDatos(entradaDefinicion);
const validarSala = validarDatos(salaDefinicion);

// Ejecuta el middleware y permite comprobar si llamó a next().
const ejecutarMiddleware = (middleware, req) => {
  let nextLlamado = false;

  middleware(req, {}, () => {
    nextLlamado = true;
  });

  return nextLlamado;
};

const idValido = "507f1f77bcf86cd799439011";

// Comprueba la validación de parámetros de ruta.
test("acepta un ObjectId válido en params", () => {
  const middleware = validarEntrada(entradaDefinicion.operaciones.obtenerPorId);

  const nextLlamado = ejecutarMiddleware(middleware, {
    params: { id: idValido },
  });

  assert.equal(nextLlamado, true);
});

test("rechaza un ObjectId inválido en params", () => {
  const middleware = validarEntrada(entradaDefinicion.operaciones.obtenerPorId);

  assert.throws(
    () =>
      ejecutarMiddleware(middleware, {
        params: { id: "123" },
      }),
    ValidationError,
  );
});

// Comprueba la validación de datos enviados en el body.
test("acepta ObjectIds válidos en body", () => {
  const middleware = validarEntrada(entradaDefinicion.operaciones.vender);

  const nextLlamado = ejecutarMiddleware(middleware, {
    body: {
      eventoId: idValido,
      usuarioId: idValido,
    },
  });

  assert.equal(nextLlamado, true);
});

test("rechaza ObjectIds inválidos en body", () => {
  const middleware = validarEntrada(entradaDefinicion.operaciones.vender);

  assert.throws(
    () =>
      ejecutarMiddleware(middleware, {
        body: {
          eventoId: "123",
          usuarioId: idValido,
        },
      }),
    ValidationError,
  );
});

// Comprueba la presencia de campos obligatorios.
test("rechaza campos requeridos ausentes", () => {
  const middleware = validarEntrada(entradaDefinicion.operaciones.vender);

  assert.throws(
    () =>
      ejecutarMiddleware(middleware, {
        body: {
          eventoId: idValido,
        },
      }),
    ValidationError,
  );
});

test("rechaza campos requeridos vacíos o nulos", () => {
  const middleware = validarEntrada(entradaDefinicion.operaciones.vender);

  for (const valor of ["", null]) {
    assert.throws(
      () =>
        ejecutarMiddleware(middleware, {
          body: {
            eventoId: valor,
            usuarioId: idValido,
          },
        }),
      ValidationError,
    );
  }
});

// Comprueba el comportamiento de campos opcionales.
test("permite omitir campos opcionales", () => {
  const middleware = validarEntrada({
    body: {
      requeridos: ["eventoId"],
      opcionales: ["usuarioId"],
    },
  });

  const nextLlamado = ejecutarMiddleware(middleware, {
    body: {
      eventoId: idValido,
    },
  });

  assert.equal(nextLlamado, true);
});

test("valida el tipo de los campos opcionales cuando se envían", () => {
  const middleware = validarEntrada({
    body: {
      requeridos: ["eventoId"],
      opcionales: ["usuarioId"],
    },
  });

  assert.throws(
    () =>
      ejecutarMiddleware(middleware, {
        body: {
          eventoId: idValido,
          usuarioId: "123",
        },
      }),
    ValidationError,
  );
});

// Comprueba que los campos ajenos a la operación no se validen.
test("ignora campos no contemplados por la operación", () => {
  const middleware = validarEntrada(entradaDefinicion.operaciones.vender);

  const nextLlamado = ejecutarMiddleware(middleware, {
    body: {
      eventoId: idValido,
      usuarioId: idValido,
      campoDesconocido: { dato: "extra" },
    },
  });

  assert.equal(nextLlamado, true);
});

// Comprueba operaciones que no requieren validación de datos.
test("permite continuar cuando la operación no tiene campos definidos", () => {
  const middleware = validarEntrada(entradaDefinicion.operaciones.obtenerTodos);

  const nextLlamado = ejecutarMiddleware(middleware, {
    body: {},
    params: {},
  });

  assert.equal(nextLlamado, true);
});

// Comprueba la validación recursiva de objetos anidados en Sala.
test("rechaza un objeto requerido ausente", () => {
  const middleware = validarSala(salaDefinicion.operaciones.crear);

  assert.throws(
    () =>
      ejecutarMiddleware(middleware, {
        body: {
          nombre: "Sala",
          capacidad: 40,
          direccion: "Calle 123",
          precioReserva: 1000,
        },
      }),
    ValidationError,
  );
});

test("rechaza atributos requeridos ausentes en un objeto anidado", () => {
  const middleware = validarSala(salaDefinicion.operaciones.crear);

  assert.throws(
    () =>
      ejecutarMiddleware(middleware, {
        body: {
          nombre: "Sala",
          capacidad: 40,
          direccion: "Calle 123",
          precioReserva: 1000,
          responsable: {
            nombre: "Laura",
            telefono: "123456",
          },
        },
      }),
    ValidationError,
  );
});

test("acepta un objeto anidado completo", () => {
  const middleware = validarSala(salaDefinicion.operaciones.crear);

  const nextLlamado = ejecutarMiddleware(middleware, {
    body: {
      nombre: "Sala",
      capacidad: 40,
      direccion: "Calle 123",
      precioReserva: 1000,
      responsable: {
        nombre: "Laura",
        apellido: "Pérez",
        telefono: "123456",
        email: "laura@example.test",
      },
    },
  });

  assert.equal(nextLlamado, true);
});

test("permite actualizar parcialmente un objeto anidado", () => {
  const middleware = validarSala(salaDefinicion.operaciones.actualizar);

  const nextLlamado = ejecutarMiddleware(middleware, {
    params: {
      id: idValido,
    },
    body: {
      responsable: {
        telefono: "99999999",
      },
    },
  });

  assert.equal(nextLlamado, true);
});

test("rechaza tipos incorrectos en atributos de un objeto anidado opcional", () => {
  const middleware = validarSala(salaDefinicion.operaciones.actualizar);

  assert.throws(
    () =>
      ejecutarMiddleware(middleware, {
        params: {
          id: idValido,
        },
        body: {
          responsable: {
            nombre: 123,
          },
        },
      }),
    ValidationError,
  );
});

import test from "node:test";
import assert from "node:assert/strict";

import validarDatos from "../../../middlewares/validarDatos.js";
import { ValidationError } from "../../../errors/errores.js";
import { entradaDefinicion } from "../../../definitions/entrada.js";
import { salaDefinicion } from "../../../definitions/sala.js";
import { eventoDefinicion } from "../../../definitions/evento.js";

// Configura los middlewares con las definiciones de cada entidad.
const validarEntrada = validarDatos(entradaDefinicion);
const validarSala = validarDatos(salaDefinicion);
const validarEvento = validarDatos(eventoDefinicion);

// Ejecuta el middleware y permite comprobar si llamó a next().
const ejecutarMiddleware = (middleware, req) => {
  let nextLlamado = false;

  middleware(req, {}, () => {
    nextLlamado = true;
  });

  return nextLlamado;
};

const idValido = "507f1f77bcf86cd799439011";
const usuarioIdValido = "507f1f77bcf86cd799439012";

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

// Comprueba parámetros de ruta que no se llaman id.
test("acepta un ObjectId válido en un parámetro distinto de id", () => {
  const middleware = validarEntrada(entradaDefinicion.operaciones.obtenerVendidasPorEvento);

  const nextLlamado = ejecutarMiddleware(middleware, {
    params: { eventoId: idValido },
  });

  assert.equal(nextLlamado, true);
});

test("rechaza un ObjectId inválido en un parámetro distinto de id", () => {
  const middleware = validarEntrada(entradaDefinicion.operaciones.obtenerVendidasPorEvento);

  assert.throws(
    () =>
      ejecutarMiddleware(middleware, {
        params: { eventoId: "123" },
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

// Definición auxiliar para probar relaciones entre distintos tipos.
const definicionComparaciones = {
  atributos: {
    cantidad: { tipo: "number" },
    limite: { tipo: "number" },
    disponible: { tipo: "boolean" },
    habilitado: { tipo: "boolean" },
    usuarioId: { tipo: "objectId" },
    responsableId: { tipo: "objectId" },
  },
  validaciones: {
    entreAtributos: [],
  },
};

// Crea un middleware con una relación configurable.
const crearMiddlewareComparacion = (relacion) => {
  const definicion = {
    ...definicionComparaciones,
    validaciones: {
      entreAtributos: [relacion],
    },
  };

  const validar = validarDatos(definicion);

  return validar({
    body: {
      requeridos: [],
      opcionales: Object.keys(definicion.atributos),
    },
  });
};

// Comprueba las relaciones entre fechas de Evento.
test("acepta fechas que cumplen las relaciones declaradas", () => {
  const middleware = validarEvento(eventoDefinicion.operaciones.crear);

  const nextLlamado = ejecutarMiddleware(middleware, {
    body: {
      nombre: "Concierto",
      tipo: "Música",
      fechaInicio: "2026-12-10T20:00:00.000Z",
      fechaFin: "2026-12-10T23:00:00.000Z",
      fechaInicioVenta: "2026-11-01T00:00:00.000Z",
      fechaFinVenta: "2026-12-10T19:00:00.000Z",
      precioEntrada: 0,
      salaId: idValido,
      usuarioId: usuarioIdValido,
    },
  });

  assert.equal(nextLlamado, true);
});

test("rechaza una fecha de fin anterior a la fecha de inicio", () => {
  const middleware = validarEvento(eventoDefinicion.operaciones.crear);

  assert.throws(
    () =>
      ejecutarMiddleware(middleware, {
        body: {
          nombre: "Concierto",
          tipo: "Música",
          fechaInicio: "2026-12-10T20:00:00.000Z",
          fechaFin: "2026-12-10T19:00:00.000Z",
          fechaInicioVenta: "2026-11-01T00:00:00.000Z",
          fechaFinVenta: "2026-12-10T19:00:00.000Z",
          precioEntrada: 0,
          salaId: idValido,
          usuarioId: usuarioIdValido,
        },
      }),
    ValidationError,
  );
});

test("rechaza una fecha de fin de venta anterior a la fecha de inicio de venta", () => {
  const middleware = validarEvento(eventoDefinicion.operaciones.crear);

  assert.throws(
    () =>
      ejecutarMiddleware(middleware, {
        body: {
          nombre: "Concierto",
          tipo: "Música",
          fechaInicio: "2026-12-10T20:00:00.000Z",
          fechaFin: "2026-12-10T23:00:00.000Z",
          fechaInicioVenta: "2026-11-01T00:00:00.000Z",
          fechaFinVenta: "2026-10-31T00:00:00.000Z",
          precioEntrada: 0,
          salaId: idValido,
          usuarioId: usuarioIdValido,
        },
      }),
    ValidationError,
  );
});

test("rechaza una fecha de fin de venta posterior al inicio del evento", () => {
  const middleware = validarEvento(eventoDefinicion.operaciones.crear);

  assert.throws(
    () =>
      ejecutarMiddleware(middleware, {
        body: {
          nombre: "Concierto",
          tipo: "Música",
          fechaInicio: "2026-12-10T20:00:00.000Z",
          fechaFin: "2026-12-10T23:00:00.000Z",
          fechaInicioVenta: "2026-11-01T00:00:00.000Z",
          fechaFinVenta: "2026-12-10T21:00:00.000Z",
          precioEntrada: 0,
          salaId: idValido,
          usuarioId: usuarioIdValido,
        },
      }),
    ValidationError,
  );
});

test("permite actualizar una fecha sin enviar su campo de comparación", () => {
  const middleware = validarEvento(eventoDefinicion.operaciones.actualizar);

  const nextLlamado = ejecutarMiddleware(middleware, {
    params: {
      id: idValido,
    },
    body: {
      fechaInicio: "2026-12-10T20:00:00.000Z",
    },
  });

  assert.equal(nextLlamado, true);
});

// Comprueba las comparaciones numéricas.
test("acepta una relación numérica que se cumple", () => {
  const middleware = crearMiddlewareComparacion({
    campo: "cantidad",
    operador: "<=",
    referencia: "limite",
  });

  const nextLlamado = ejecutarMiddleware(middleware, {
    body: {
      cantidad: 5,
      limite: 10,
    },
  });

  assert.equal(nextLlamado, true);
});

test("rechaza una relación numérica que no se cumple", () => {
  const middleware = crearMiddlewareComparacion({
    campo: "cantidad",
    operador: "<=",
    referencia: "limite",
  });

  assert.throws(
    () =>
      ejecutarMiddleware(middleware, {
        body: {
          cantidad: 15,
          limite: 10,
        },
      }),
    ValidationError,
  );
});

// Comprueba las comparaciones de igualdad entre booleanos.
test("acepta una comparación de igualdad entre booleanos", () => {
  const middleware = crearMiddlewareComparacion({
    campo: "disponible",
    operador: "===",
    referencia: "habilitado",
  });

  const nextLlamado = ejecutarMiddleware(middleware, {
    body: {
      disponible: false,
      habilitado: false,
    },
  });

  assert.equal(nextLlamado, true);
});

test("rechaza una comparación de igualdad entre booleanos que no se cumple", () => {
  const middleware = crearMiddlewareComparacion({
    campo: "disponible",
    operador: "===",
    referencia: "habilitado",
  });

  assert.throws(
    () =>
      ejecutarMiddleware(middleware, {
        body: {
          disponible: true,
          habilitado: false,
        },
      }),
    ValidationError,
  );
});

// Comprueba las comparaciones de igualdad entre ObjectIds.
test("acepta una comparación de igualdad entre ObjectIds", () => {
  const middleware = crearMiddlewareComparacion({
    campo: "usuarioId",
    operador: "===",
    referencia: "responsableId",
  });

  const nextLlamado = ejecutarMiddleware(middleware, {
    body: {
      usuarioId: idValido,
      responsableId: idValido,
    },
  });

  assert.equal(nextLlamado, true);
});

test("rechaza una comparación de igualdad entre ObjectIds que no se cumple", () => {
  const middleware = crearMiddlewareComparacion({
    campo: "usuarioId",
    operador: "===",
    referencia: "responsableId",
  });

  assert.throws(
    () =>
      ejecutarMiddleware(middleware, {
        body: {
          usuarioId: idValido,
          responsableId: "507f191e810c19729de860ea",
        },
      }),
    ValidationError,
  );
});

// Comprueba que no se permitan operadores incompatibles con el tipo.
test("rechaza operadores de orden para atributos booleanos", () => {
  const middleware = crearMiddlewareComparacion({
    campo: "disponible",
    operador: ">",
    referencia: "habilitado",
  });

  assert.throws(
    () =>
      ejecutarMiddleware(middleware, {
        body: {
          disponible: true,
          habilitado: false,
        },
      }),
    /no es válido para atributos de tipo 'boolean'/,
  );
});

// Comprueba que no se puedan comparar atributos de tipos diferentes.
test("rechaza relaciones entre atributos de tipos diferentes", () => {
  const middleware = crearMiddlewareComparacion({
    campo: "cantidad",
    operador: "===",
    referencia: "disponible",
  });

  assert.throws(
    () =>
      ejecutarMiddleware(middleware, {
        body: {
          cantidad: 10,
          disponible: true,
        },
      }),
    /atributos de tipos diferentes/,
  );
});

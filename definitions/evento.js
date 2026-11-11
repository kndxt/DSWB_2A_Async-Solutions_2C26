import { reservaDefinicion } from "./reserva.js";

/**
 * Define la estructura de Evento y los datos que recibe cada operación.
 * Es una fuente compartida por middlewares, modelos y otras capas.
 */

export const eventoDefinicion = {
  // Atributos que componen un documento de Evento.
  atributos: {
    nombre: {
      tipo: "string",
      requerido: true,
    },
    descripcion: {
      tipo: "string",
    },
    tipo: {
      tipo: "string",
      requerido: true,
    },
    fechaInicio: {
      tipo: "date",
      requerido: true,
    },
    fechaFin: {
      tipo: "date",
      requerido: true,
    },
    fechaInicioVenta: {
      tipo: "date",
      requerido: true,
    },
    fechaFinVenta: {
      tipo: "date",
      requerido: true,
    },
    precioEntrada: {
      tipo: "number",
      requerido: true,
      validaciones: {
        min: 0,
      },
    },
    estado: {
      tipo: "string",
      valores: {
        ACTIVO: "activo",
        FINALIZADO: "finalizado",
        CANCELADO: "cancelado",
      },
      default: "activo",
    },
    salaId: {
      tipo: "objectId",
      requerido: true,
      referencia: "Sala",
    },
  },

  // Parámetros utilizados por las operaciones de Evento.
  parametros: {
    id: {
      tipo: "objectId",
    },
  },

  // Restricciones que relacionan distintos atributos.
  validaciones: {
    entreAtributos: [
      {
        campo: "fechaFin",
        operador: ">=",
        referencia: "fechaInicio",
      },
      {
        campo: "fechaFinVenta",
        operador: ">=",
        referencia: "fechaInicioVenta",
      },
      {
        campo: "fechaFinVenta",
        operador: "<=",
        referencia: "fechaInicio",
      },
    ],
  },

  // Datos que cada operación recibe del cliente.
  operaciones: {
    obtenerTodos: {},

    obtenerPorId: {
      params: {
        requeridos: ["id"],
        opcionales: [],
      },
    },

    crear: {
      body: {
        requeridos: [
          "nombre",
          "tipo",
          "fechaInicio",
          "fechaFin",
          "fechaInicioVenta",
          "fechaFinVenta",
          "precioEntrada",
          "salaId",
          "usuarioId",
        ],
        opcionales: ["descripcion"],
        atributos: {
          usuarioId: reservaDefinicion.atributos.usuarioId,
        },
      },
    },

    actualizar: {
      params: {
        requeridos: ["id"],
        opcionales: [],
      },
      body: {
        requeridos: [],
        opcionales: [
          "nombre",
          "descripcion",
          "tipo",
          "fechaInicio",
          "fechaFin",
          "fechaInicioVenta",
          "fechaFinVenta",
          "precioEntrada",
          "estado",
          "salaId",
        ],
      },
    },

    obtenerProximos: {},
  },
};

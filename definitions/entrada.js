/**
 * Define la estructura de Entrada y los datos que recibe cada operación.
 * Es una fuente compartida por middlewares, modelos y otras capas.
 */

export const entradaDefinicion = {
  // Atributos que componen un documento de Entrada.
  atributos: {
    eventoId: {
      tipo: "objectId",
      requerido: true,
    },
    usuarioId: {
      tipo: "objectId",
      requerido: true,
    },
    estado: {
      tipo: "string",
      requerido: true,
      valores: {
        VENDIDA: "vendida",
        CANCELADA: "cancelada",
      },
    },
    fechaVenta: {
      tipo: "date",
      requerido: true,
    },
  },

  // Datos que cada operación espera recibir del cliente.
  operaciones: {
    obtenerTodos: {},

    obtenerPorId: {
      params: {
        requeridos: ["id"],
        opcionales: [],
      },
    },

    vender: {
      body: {
        requeridos: ["eventoId", "usuarioId"],
        opcionales: [],
      },
    },

    cancelar: {
      params: {
        requeridos: ["id"],
        opcionales: [],
      },
    },

    obtenerVendidasPorEvento: {
      params: {
        requeridos: ["eventoId"],
        opcionales: [],
      },
    },

    obtenerDisponiblesPorEvento: {
      params: {
        requeridos: ["eventoId"],
        opcionales: [],
      },
    },
  },
};
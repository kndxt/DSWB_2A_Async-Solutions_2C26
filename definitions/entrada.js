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
      referencia: "Evento",
    },
    usuarioId: {
      tipo: "objectId",
      requerido: true,
      referencia: "Usuario",
    },
    estado: {
      tipo: "string",
      requerido: true,
      valores: {
        VENDIDA: "vendida",
        CANCELADA: "cancelada",
      },
      default: "vendida",
    },
    fechaVenta: {
      tipo: "date",
      requerido: true,
      default: Date.now,
    },
  },

  // Parámetros utilizados por las operaciones de Entrada.
  parametros: {
    id: {
      tipo: "objectId",
    },
    eventoId: {
      tipo: "objectId",
      referencia: "Evento",
    },
  },

  // Datos que cada operación recibe del cliente.
  // Los datos derivados de la sesión autenticada se obtienen en el controlador.
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
        requeridos: ["eventoId"],
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

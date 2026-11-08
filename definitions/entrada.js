
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
      },
    },

    vender: {
      body: {
        requeridos: ["eventoId", "usuarioId"],
      },
    },

    cancelar: {
      params: {
        requeridos: ["id"],
      },
    },

    obtenerVendidasPorEvento: {
      params: {
        requeridos: ["eventoId"],
      },
    },

    obtenerDisponiblesPorEvento: {
      params: {
        requeridos: ["eventoId"],
      },
    },
  },
};

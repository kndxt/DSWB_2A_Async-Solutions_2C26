/**
 * Define la estructura de Sala y los datos que recibe cada operación.
 * Es una fuente compartida por middlewares, modelos y otras capas.
 */

export const salaDefinicion = {
  // Atributos que componen un documento de Sala.
  atributos: {
    nombre: {
      tipo: "string",
      requerido: true,
    },
    capacidad: {
      tipo: "number",
      requerido: true,
      validaciones: {
        min: 1,
        entero: true,
      },
    },
    direccion: {
      tipo: "string",
      requerido: true,
    },
    precioReserva: {
      tipo: "number",
      requerido: true,
      validaciones: {
        min: 0,
      },
    },
    responsable: {
      tipo: "object",
      requerido: true,
      atributos: {
        nombre: {
          tipo: "string",
          requerido: true,
        },
        apellido: {
          tipo: "string",
          requerido: true,
        },
        telefono: {
          tipo: "string",
          requerido: true,
        },
        email: {
          tipo: "string",
          requerido: true,
        },
      },
    },
    estado: {
      tipo: "string",
      valores: {
        ACTIVA: "activa",
        INACTIVA: "inactiva",
      },
      default: "activa",
    },
  },

  // Datos que recibe cada operación.
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
        requeridos: ["nombre", "capacidad", "direccion", "precioReserva", "responsable"],
        opcionales: [],
      },
    },

    actualizar: {
      params: {
        requeridos: ["id"],
        opcionales: [],
      },
      body: {
        requeridos: [],
        opcionales: ["nombre", "capacidad", "direccion", "precioReserva", "responsable", "estado"],
      },
    },
  },
};

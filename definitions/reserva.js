export const reservaDefinicion = {
  // Atributos que componen el registro histórico de una Reserva.
  atributos: {
    usuarioId: {
      tipo: "objectId",
      requerido: true,
      referencia: "Usuario",
    },
    fechaReserva: {
      tipo: "date",
      requerido: true,
      default: Date.now,
    },
    precioFinal: {
      tipo: "number",
      requerido: true,
      validaciones: {
        min: 0,
      },
    },
  },

  // Parámetros utilizados por las operaciones de Reserva.
  parametros: {
    eventoId: {
      tipo: "objectId",
      referencia: "Evento",
    },
  },

  operaciones: {
    obtenerTodos: {},
    obtenerPorEvento: {
      params: {
        requeridos: ["eventoId"],
        opcionales: [],
      },
    },
  },
};

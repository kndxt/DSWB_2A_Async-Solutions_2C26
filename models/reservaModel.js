import mongoose from "mongoose";

// Subdocumento embebido en Evento.
// Registro histórico: guarda el usuario que reservó, cuándo y a qué precio.
const reservaSchema = new mongoose.Schema(
  {
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: [true, "El usuario de la reserva es obligatorio"],
    },
    fechaReserva: {
      type: Date,
      default: Date.now,
      required: true,
    },
    precioFinal: {
      type: Number,
      required: [true, "El precio final es obligatorio"],
      min: [0, "El precio final debe ser mayor o igual a cero"],
    },
  },
  { _id: false },
);

export { reservaSchema };
export default reservaSchema;
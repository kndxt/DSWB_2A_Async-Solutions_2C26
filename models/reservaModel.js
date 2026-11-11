import mongoose from "mongoose";
import { reservaDefinicion } from "../definitions/reserva.js";
import { obtenerTipoMongoose } from "../utils/traductoresMongoose.js";

const { atributos } = reservaDefinicion;

// Subdocumento embebido en Evento.
// Registro histórico: guarda el usuario que reservó, cuándo y a qué precio.
const reservaSchema = new mongoose.Schema(
  {
    usuarioId: {
      type: obtenerTipoMongoose(atributos.usuarioId.tipo),
      ref: atributos.usuarioId.referencia,
      required: atributos.usuarioId.requerido,
    },
    fechaReserva: {
      type: obtenerTipoMongoose(atributos.fechaReserva.tipo),
      default: atributos.fechaReserva.default,
      required: atributos.fechaReserva.requerido,
    },
    precioFinal: {
      type: obtenerTipoMongoose(atributos.precioFinal.tipo),
      required: atributos.precioFinal.requerido,
      min: atributos.precioFinal.validaciones.min,
    },
  },
  { _id: false },
);

export { reservaSchema };
export default reservaSchema;

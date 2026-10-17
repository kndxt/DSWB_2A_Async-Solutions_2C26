import mongoose from "mongoose";


const ESTADOS_SALA = {
  ACTIVA: "activa",
  INACTIVA: "inactiva",
};

const ESTADOS_VALIDOS = Object.values(ESTADOS_SALA);

// Subdocumento embebido con los datos de contacto del responsable.
// No necesita _id propio porque siempre vive dentro de una sala.
const responsableSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: [true, "El nombre del responsable es obligatorio"], trim: true },
    apellido: { type: String, required: [true, "El apellido del responsable es obligatorio"], trim: true },
    telefono: { type: String, required: [true, "El teléfono del responsable es obligatorio"], trim: true },
    email: { type: String, required: [true, "El email del responsable es obligatorio"], trim: true },
  },
  { _id: false },
);

const salaSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: [true, "El nombre es obligatorio"], trim: true },
    capacidad: {
      type: Number,
      required: [true, "La capacidad es obligatoria"],
      validate: {
        validator: (valor) => valor > 0,
        message: "La capacidad debe ser un número mayor a cero",
      },
    },
    direccion: { type: String, required: [true, "La dirección es obligatoria"], trim: true },
    precioReserva: {
      type: Number,
      required: [true, "El precio de reserva es obligatorio"],
      min: [0, "El precio de reserva debe ser un número mayor o igual a cero"],
    },
    responsable: { type: responsableSchema, required: [true, "El responsable es obligatorio"] 
    },
    estado: {
      type: String,
      enum: {
        values: ESTADOS_VALIDOS,
        message: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(", ")}`,
      },
      default: ESTADOS_SALA.ACTIVA,
    },
  },
  {
    versionKey: false,
    toJSON: {
      // Mantiene el contrato de la API: se responde `id` (string) en lugar de `_id`.
      transform: (doc, { _id, ...resto }) => ({ id: _id.toString(), ...resto }),
    },
  },
);

salaSchema.statics.obtenerPorId = function (id) {
  return this.findById(id);
};

const Sala = mongoose.model("Sala", salaSchema);

export { ESTADOS_SALA };
export default Sala;
import mongoose from "mongoose";
import { reservaSchema } from "./reservaModel.js";

const ESTADOS_EVENTO = {
  ACTIVO: "activo",
  FINALIZADO: "finalizado",
  CANCELADO: "cancelado",
};

const ESTADOS_VALIDOS = Object.values(ESTADOS_EVENTO);

const fechaObligatoria = (mensaje) => ({ type: Date, required: [true, mensaje] });

const eventoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: [true, "El nombre es obligatorio"], trim: true },
    descripcion: { type: String, trim: true },
    tipo: { type: String, required: [true, "El tipo es obligatorio"], trim: true },
    fechaInicio: fechaObligatoria("La fecha de inicio es obligatoria"),
    fechaFin: fechaObligatoria("La fecha de fin es obligatoria"),
    fechaInicioVenta: fechaObligatoria("La fecha de inicio de venta es obligatoria"),
    fechaFinVenta: fechaObligatoria("La fecha de fin de venta es obligatoria"),
    precioEntrada: {
      type: Number,
      required: [true, "El precio de entrada es obligatorio"],
      validate: {
        validator: (valor) => valor > 0,
        message: "El precio de entrada debe ser un número mayor a cero",
      },
    },
    estado: {
      type: String,
      enum: {
        values: ESTADOS_VALIDOS,
        message: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(", ")}`,
      },
      default: ESTADOS_EVENTO.ACTIVO,
    },
    // Referencia a la sala: se guarda su ObjectId y se responde como string.
    salaId: { type: mongoose.Schema.Types.ObjectId, ref: "Sala", required: [true, "La sala es obligatoria"] },
    // Registro histórico de la reserva, creado junto con el evento.
    reserva: { type: reservaSchema, required: [true, "La reserva es obligatoria"] },
  },
  {
    versionKey: false,
    toJSON: {
      // Mantiene el contrato de la API: se responde `id` (string) en lugar de `_id`.
      transform: (doc, { _id, ...resto }) => ({ id: _id.toString(), ...resto }),
    },
  },
);

// Regla de duplicados: mismo nombre + misma sala + misma fecha de inicio.
// Permite varios eventos en una misma sala si cambia el horario o la fecha de inicio.
eventoSchema.index({ nombre: 1, salaId: 1, fechaInicio: 1 }, { unique: true });

eventoSchema.statics.obtenerTodos = function () {
  return this.find().sort({ _id: 1 });
};

eventoSchema.statics.obtenerPorId = async function (id) {
  if (!mongoose.isObjectIdOrHexString(id)) return null;
  return this.findById(id);
};

eventoSchema.statics.obtenerPorSala = async function (salaId) {
  if (!mongoose.isObjectIdOrHexString(salaId)) return [];
  return this.find({ salaId }).sort({ _id: 1 });
};

eventoSchema.statics.obtenerProximos = function () {
  return this.find({ fechaInicio: { $gt: new Date() } }).sort({ _id: 1 });
};

eventoSchema.statics.crear = function (data) {
  return this.create(data);
};

// Carga el evento, aplica los cambios y guarda: así corren todas las validaciones del esquema.
eventoSchema.statics.actualizar = async function (id, cambios) {
  const evento = await this.obtenerPorId(id);
  if (!evento) return null;
  evento.set(cambios);
  return evento.save();
};

// Indica si ya existe un evento con el mismo nombre, sala y fecha de inicio.
eventoSchema.statics.existeDuplicado = async function ({ nombre, salaId, fechaInicio, excluirId }) {
  const filtro = { nombre: String(nombre).trim(), salaId, fechaInicio: new Date(fechaInicio) };
  if (excluirId) filtro._id = { $ne: excluirId };
  return Boolean(await this.exists(filtro));
};

// Verifica que el evento esté activo y dentro de su período de venta.
// Recibe el evento como parámetro (documento de Mongoose u objeto plano).
eventoSchema.statics.puedeVenderEntradas = function (evento) {
  if (evento.estado !== ESTADOS_EVENTO.ACTIVO) return false;

  const hoy = new Date();
  const inicioVenta = new Date(evento.fechaInicioVenta);
  const finVenta = new Date(evento.fechaFinVenta);

  return hoy >= inicioVenta && hoy <= finVenta;
};

const Evento = mongoose.model("Evento", eventoSchema);

export { Evento, ESTADOS_EVENTO, ESTADOS_VALIDOS };
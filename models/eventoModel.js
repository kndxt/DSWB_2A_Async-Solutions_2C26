import mongoose from "mongoose";
import { eventoDefinicion } from "../definitions/evento.js";
import { obtenerTipoMongoose } from "../utils/traductoresMongoose.js";
import { reservaSchema } from "./reservaModel.js";

const { atributos } = eventoDefinicion;

export const ESTADOS_EVENTO = atributos.estado.valores;

const eventoSchema = new mongoose.Schema(
  {
    nombre: {
      type: obtenerTipoMongoose(atributos.nombre.tipo),
      required: atributos.nombre.requerido,
      trim: true,
    },
    descripcion: {
      type: obtenerTipoMongoose(atributos.descripcion.tipo),
      trim: true,
    },
    tipo: {
      type: obtenerTipoMongoose(atributos.tipo.tipo),
      required: atributos.tipo.requerido,
      trim: true,
    },
    fechaInicio: {
      type: obtenerTipoMongoose(atributos.fechaInicio.tipo),
      required: atributos.fechaInicio.requerido,
    },
    fechaFin: {
      type: obtenerTipoMongoose(atributos.fechaFin.tipo),
      required: atributos.fechaFin.requerido,
    },
    fechaInicioVenta: {
      type: obtenerTipoMongoose(atributos.fechaInicioVenta.tipo),
      required: atributos.fechaInicioVenta.requerido,
    },
    fechaFinVenta: {
      type: obtenerTipoMongoose(atributos.fechaFinVenta.tipo),
      required: atributos.fechaFinVenta.requerido,
    },
    precioEntrada: {
      type: obtenerTipoMongoose(atributos.precioEntrada.tipo),
      required: atributos.precioEntrada.requerido,
      min: atributos.precioEntrada.validaciones.min,
    },
    estado: {
      type: obtenerTipoMongoose(atributos.estado.tipo),
      enum: Object.values(ESTADOS_EVENTO),
      default: atributos.estado.default,
    },
    // Referencia a la sala: se guarda su ObjectId y se responde como string.
    salaId: {
      type: obtenerTipoMongoose(atributos.salaId.tipo),
      ref: atributos.salaId.referencia,
      required: atributos.salaId.requerido,
    },
    // Registro histórico de la reserva, creado junto con el evento.
    reserva: {
      type: reservaSchema,
      required: true,
    },
  },
  {
    versionKey: false,
    toJSON: {
      // Mantiene el contrato de la API: se responde id (string) en lugar de _id.
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

eventoSchema.statics.obtenerPorId = function (id) {
  if (!mongoose.isObjectIdOrHexString(id)) return null;
  return this.findById(id);
};

eventoSchema.statics.obtenerPorSala = function (salaId) {
  if (!mongoose.isObjectIdOrHexString(salaId)) return [];
  return this.find({ salaId }).sort({ _id: 1 });
};

eventoSchema.statics.obtenerProximos = function () {
  return this.find({
    fechaInicio: { $gt: new Date() },
  }).sort({ _id: 1 });
};

eventoSchema.statics.crear = function (datos) {
  return this.create(datos);
};

// Aplica los cambios al documento recibido y lo guarda.
// Así se ejecutan las validaciones del esquema sin volver a consultar.
eventoSchema.statics.actualizar = function (evento, cambios) {
  evento.set(cambios);
  return evento.save();
};

// Indica si ya existe un evento con el mismo nombre,
// sala y fecha de inicio, excluyendo opcionalmente un evento.
eventoSchema.statics.existeDuplicado = function ({ nombre, salaId, fechaInicio, excluirId }) {
  const filtro = {
    nombre: String(nombre).trim(),
    salaId,
    fechaInicio: new Date(fechaInicio),
  };

  if (excluirId) {
    filtro._id = { $ne: excluirId };
  }

  return this.exists(filtro);
};

// Comprueba si el período del evento se superpone
// con el de otro evento de la misma sala.
eventoSchema.statics.existeSolapamiento = function ({ salaId, fechaInicio, fechaFin, excluirId }) {
  const filtro = {
    salaId,
    fechaInicio: { $lt: new Date(fechaFin) },
    fechaFin: { $gt: new Date(fechaInicio) },
  };

  if (excluirId) {
    filtro._id = { $ne: excluirId };
  }

  return this.exists(filtro);
};

// Comprueba si una sala tiene eventos próximos activos.
eventoSchema.statics.existeProximoActivoPorSala = function (salaId) {
  return this.exists({
    salaId,
    estado: ESTADOS_EVENTO.ACTIVO,
    fechaInicio: { $gte: new Date() },
  });
};

export const Evento = mongoose.models.Evento || mongoose.model("Evento", eventoSchema, "eventos");

export default Evento;

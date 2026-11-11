import mongoose from "mongoose";
import { entradaDefinicion } from "../definitions/entrada.js";
import { obtenerTipoMongoose } from "../utils/traductoresMongoose.js";

// Atributos y estados definidos centralmente.
const atributos = entradaDefinicion.atributos;
export const ESTADOS_ENTRADA = atributos.estado.valores;

// Esquema de persistencia de Entrada.
export const entradaSchema = new mongoose.Schema(
  {
    eventoId: {
      type: obtenerTipoMongoose(atributos.eventoId.tipo),
      ref: atributos.eventoId.referencia,
      required: atributos.eventoId.requerido,
    },
    usuarioId: {
      type: obtenerTipoMongoose(atributos.usuarioId.tipo),
      ref: atributos.usuarioId.referencia,
      required: atributos.usuarioId.requerido,
    },
    estado: {
      type: obtenerTipoMongoose(atributos.estado.tipo),
      enum: Object.values(ESTADOS_ENTRADA),
      default: atributos.estado.default,
      required: atributos.estado.requerido,
    },
    fechaVenta: {
      type: obtenerTipoMongoose(atributos.fechaVenta.tipo),
      default: atributos.fechaVenta.default,
      required: atributos.fechaVenta.requerido,
    },
  },
  {
    versionKey: false,
    toJSON: {
      transform: (_doc, { _id, ...resto }) => ({
        id: _id.toString(),
        ...resto,
      }),
    },
  },
);

// Construye una consulta con los detalles relacionados cuando se solicitan.
const incluirDetalles = (consulta, incluir) => {
  if (incluir) {
    return consulta
      .populate({
        path: "eventoId",
        select: "nombre",
      })
      .populate({
        path: "usuarioId",
        select: "nombre apellido",
      });
  }

  return consulta;
};

entradaSchema.statics.crear = function (data) {
  return this.create(data);
};

entradaSchema.statics.obtenerTodos = function (opciones = {}) {
  const { detalles = false } = opciones;

  return incluirDetalles(this.find(), detalles);
};

entradaSchema.statics.obtenerPorId = function (id, opciones = {}) {
  const { detalles = false } = opciones;

  return incluirDetalles(this.findById(id), detalles);
};

entradaSchema.statics.obtenerPorEvento = function (eventoId) {
  return this.find({ eventoId });
};

entradaSchema.statics.obtenerVendidasPorEvento = function (eventoId) {
  return this.find({
    eventoId,
    estado: ESTADOS_ENTRADA.VENDIDA,
  });
};

entradaSchema.statics.cancelar = function (id, opciones = {}) {
  const { detalles = false } = opciones;

  const consulta = this.findOneAndUpdate(
    {
      _id: id,
      estado: ESTADOS_ENTRADA.VENDIDA,
    },
    {
      estado: ESTADOS_ENTRADA.CANCELADA,
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  );

  return incluirDetalles(consulta, detalles);
};

// Cuenta las entradas vendidas de un evento y calcula cuántas quedan disponibles según su capacidad.
entradaSchema.statics.obtenerDisponiblesPorEvento = async function (eventoId, capacidad) {
  const entradasVendidas = await this.countDocuments({ eventoId, estado: ESTADOS_ENTRADA.VENDIDA });

  return capacidad - entradasVendidas;
};

// Reutiliza el modelo Entrada si ya existe; de lo contrario, lo registra con el esquema y la colección "entradas".
export const Entrada =
  mongoose.models.Entrada || mongoose.model("Entrada", entradaSchema, "entradas");

export default Entrada;

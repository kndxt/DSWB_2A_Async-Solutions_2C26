import mongoose from "mongoose";
import {entradaDefinicion} from "../definitions/entrada.js";
import {obtenerTipoMongoose} from "../utils/tiposMongoose.js";


// Atributos y estados definidos centralmente.
const atributos = entradaDefinicion.atributos;
export const ESTADOS_ENTRADA = atributos.estado.valores;

// Esquema de persistencia de Entrada.
export const entradaSchema = new mongoose.Schema(
  {
    eventoId: {
      type: obtenerTipoMongoose(atributos.eventoId.tipo),
      ref: "Evento",
      required: atributos.eventoId.requerido,
    },
    usuarioId: {
      type: obtenerTipoMongoose(atributos.usuarioId.tipo),
      ref: "Usuario",
      required: atributos.usuarioId.requerido,
    },
    estado: {
      type: obtenerTipoMongoose(atributos.estado.tipo),
      enum: Object.values(atributos.estado.valores),
      default: ESTADOS_ENTRADA.VENDIDA,
      required: atributos.estado.requerido,
    },
    fechaVenta: {
      type: obtenerTipoMongoose(atributos.fechaVenta.tipo),
      default: Date.now,
      required: atributos.fechaVenta.requerido,
    },
  },
  {
    versionKey: false,
    toJSON: {
      transform: (doc, { _id, ...resto }) => ({
        id: _id.toString(),
        ...resto,
      }),
    },
  }
);

entradaSchema.statics.crear = function (data) {
  return this.create(data);
}

entradaSchema.statics.obtenerTodos = function (){
  return this.find();
}

entradaSchema.statics.obtenerPorId = function (id) {
  return this.findById(id);
}

entradaSchema.statics.obtenerPorEvento = function (eventoId) {
  return this.find({ eventoId });
}

entradaSchema.statics.obtenerVendidasPorEvento = function (eventoId) {
  return this.find(
    { 
      eventoId, 
      estado: ESTADOS_ENTRADA.VENDIDA 
    }
  );
}

entradaSchema.statics.cancelar = function (id) {

  return this.findOneAndUpdate(
    { 
      _id: id, 
      estado: ESTADOS_ENTRADA.VENDIDA 
    },
    { 
      estado: ESTADOS_ENTRADA.CANCELADA 
    },
    {
      returnDocument: 'after',
      runValidators: true
    }
  );

}

// Cuenta las entradas vendidas de un evento y calcula cuántas quedan disponibles según su capacidad.
entradaSchema.statics.obtenerDisponiblesPorEvento = async function (eventoId, capacidad) {
  const entradasVendidas = 
    await this.countDocuments(
      { eventoId, estado: ESTADOS_ENTRADA.VENDIDA }
    );

  return capacidad - entradasVendidas;
}

entradaSchema.statics.obtenerTodosConDetalles = function () {
  return this.find()
    .populate({
      path: "eventoId",
      select: "nombre",
    })
    .populate({
      path: "usuarioId",
      select: "nombre apellido",
    });
};

// Reutiliza el modelo Entrada si ya existe; de lo contrario, lo registra con el esquema y la colección "entradas".
export const Entrada = mongoose.models.Entrada || mongoose.model("Entrada", entradaSchema, "entradas");

export default Entrada;
import mongoose from "mongoose";

// Estados posibles de una entrada.
export const ESTADOS_ENTRADA = {
  VENDIDA: "vendida",
  CANCELADA: "cancelada",
};

export const entradaSchema = new mongoose.Schema({
  eventoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Evento",
    required: true,
  },
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Usuario",
    required: true,
  },
  estado: {
    type: String,
    enum: Object.values(ESTADOS_ENTRADA),
    default: ESTADOS_ENTRADA.VENDIDA,
    required: true,
  },
  fechaVenta: {
    type: Date,
    default: Date.now,
    required: true,
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
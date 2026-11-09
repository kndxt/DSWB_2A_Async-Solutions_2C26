import mongoose from "mongoose";

// Equivalencias entre los tipos declarativos y los tipos de Mongoose.
const tiposMongoose = {
  string: String,
  number: Number,
  boolean: Boolean,
  date: Date,
  objectId: mongoose.Schema.Types.ObjectId,
};

// Devuelve el tipo correspondiente de Mongoose.
export const obtenerTipoMongoose = (tipo) => {
  const tipoMongoose = tiposMongoose[tipo];

  if (!tipoMongoose) {
    throw new Error(`Tipo de dato no soportado: ${tipo}`);
  }

  return tipoMongoose;
};

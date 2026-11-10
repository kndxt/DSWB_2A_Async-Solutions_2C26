import mongoose from "mongoose";

// Equivalencias entre los tipos declarativos y los tipos de Mongoose.
const tiposMongoose = {
  string: String,
  number: Number,
  boolean: Boolean,
  date: Date,
  objectId: mongoose.Schema.Types.ObjectId,
};

// Traduce un tipo declarativo al tipo correspondiente de Mongoose.
export const obtenerTipoMongoose = (tipo) => {
  const tipoMongoose = tiposMongoose[tipo];

  if (!tipoMongoose) {
    throw new Error(`Tipo de dato no soportado: ${tipo}`);
  }

  return tipoMongoose;
};

// Traduce la restricción de número entero a un validador de Mongoose.
export const obtenerValidadorMongoose = (entero) => {
  return entero ? Number.isInteger : undefined;
};

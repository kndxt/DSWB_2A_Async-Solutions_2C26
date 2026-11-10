import mongoose from "mongoose";
import { salaDefinicion } from "../definitions/sala.js";
import {
  obtenerTipoMongoose,
  obtenerValidadorMongoose,
} from "../utils/traductoresMongoose.js";

// Atributos y estados definidos centralmente.
const atributos = salaDefinicion.atributos;
export const ESTADOS_SALA = atributos.estado.valores;

// Subdocumento embebido con los datos de contacto del responsable.
// No necesita _id propio porque siempre vive dentro de una sala.
const responsableSchema = new mongoose.Schema(
  {
    nombre: {
      type: obtenerTipoMongoose(atributos.responsable.atributos.nombre.tipo),
      required: atributos.responsable.atributos.nombre.requerido,
      trim: true,
    },
    apellido: {
      type: obtenerTipoMongoose(atributos.responsable.atributos.apellido.tipo),
      required: atributos.responsable.atributos.apellido.requerido,
      trim: true,
    },
    telefono: {
      type: obtenerTipoMongoose(atributos.responsable.atributos.telefono.tipo),
      required: atributos.responsable.atributos.telefono.requerido,
      trim: true,
    },
    email: {
      type: obtenerTipoMongoose(atributos.responsable.atributos.email.tipo),
      required: atributos.responsable.atributos.email.requerido,
      trim: true,
    },
  },
  { _id: false },
);

// Esquema de persistencia de Sala.
const salaSchema = new mongoose.Schema(
  {
    nombre: {
      type: obtenerTipoMongoose(atributos.nombre.tipo),
      required: atributos.nombre.requerido,
      trim: true,
    },
    capacidad: {
      type: obtenerTipoMongoose(atributos.capacidad.tipo),
      required: atributos.capacidad.requerido,
      min: atributos.capacidad.validaciones.min,
      validate: {
        validator: obtenerValidadorMongoose(
          atributos.capacidad.validaciones.entero,
        ),
      },
    },
    direccion: {
      type: obtenerTipoMongoose(atributos.direccion.tipo),
      required: atributos.direccion.requerido,
      trim: true,
    },
    precioReserva: {
      type: obtenerTipoMongoose(atributos.precioReserva.tipo),
      required: atributos.precioReserva.requerido,
      min: atributos.precioReserva.validaciones.min,
    },
    responsable: {
      type: responsableSchema,
      required: atributos.responsable.requerido,
    },
    estado: {
      type: obtenerTipoMongoose(atributos.estado.tipo),
      enum: Object.values(ESTADOS_SALA),
      default: atributos.estado.default,
    },
  },
  {
    versionKey: false,
    toJSON: {
      // Mantiene el contrato de la API: se responde `id` (string) en lugar de `_id`.
      transform: (_doc, { _id, ...resto }) => ({
        id: _id.toString(),
        ...resto,
      }),
    },
  },
);

/**
 * Prepara los cambios para una actualización parcial.
 * Convierte los campos anidados indicados a rutas con dot notation,
 * evitando reemplazar subdocumentos completos.
 */
const prepararCambios = (cambios, camposAnidados = []) => {
  const resultado = {};

  for (const [campo, valor] of Object.entries(cambios)) {
    if (
      camposAnidados.includes(campo) &&
      valor !== null &&
      typeof valor === "object" &&
      !Array.isArray(valor) &&
      !(valor instanceof Date)
    ) {
      for (const [atributo, dato] of Object.entries(valor)) {
        resultado[`${campo}.${atributo}`] = dato;
      }
    } else {
      resultado[campo] = valor;
    }
  }

  return resultado;
};

// Operaciones de persistencia.
salaSchema.statics.obtenerTodos = function () {
  return this.find().sort({ _id: 1 });
};

salaSchema.statics.obtenerPorId = function (id) {
  return this.findById(id);
};

salaSchema.statics.crear = function (datos) {
  return this.create(datos);
};

salaSchema.statics.actualizar = function (id, cambios) {
  return this.findByIdAndUpdate(
    id,
    {
      $set: prepararCambios(cambios, ["responsable"]),
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  );
};

export const Sala = mongoose.models.Sala || mongoose.model("Sala", salaSchema, "salas");

export default Sala;
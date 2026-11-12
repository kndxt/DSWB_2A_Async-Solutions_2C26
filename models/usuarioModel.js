import mongoose from "mongoose";
import { usuarioDefinicion, ROLES_VALIDOS, ESTADOS_VALIDOS } from "../definitions/usuario.js";
import { obtenerTipoMongoose } from "../utils/traductoresMongoose.js";

const { atributos } = usuarioDefinicion;

const usuarioSchema = new mongoose.Schema(
  {
    nombre: {
      type: obtenerTipoMongoose(atributos.nombre.tipo),
      required: atributos.nombre.requerido,
      trim: true,
    },
    apellido: {
      type: obtenerTipoMongoose(atributos.apellido.tipo),
      required: atributos.apellido.requerido,
      trim: true,
    },
    email: {
      type: obtenerTipoMongoose(atributos.email.tipo),
      required: atributos.email.requerido,
      unique: true,
      lowercase: true,
      trim: true,
    },
    telefono: {
      type: obtenerTipoMongoose(atributos.telefono.tipo),
      trim: true,
    },
    password: {
      type: obtenerTipoMongoose(atributos.password.tipo),
      required: atributos.password.requerido,
    },
    estado: {
      type: obtenerTipoMongoose(atributos.estado.tipo),
      enum: ESTADOS_VALIDOS,
      default: atributos.estado.default,
    },
    rol: {
      type: obtenerTipoMongoose(atributos.rol.tipo),
      enum: ROLES_VALIDOS,
      default: atributos.rol.default,
    },
  },
  {
    versionKey: false,
    toJSON: {
      // Se responde `id` en lugar de `_id`, y la contraseña nunca se devuelve.
      transform: (_doc, { _id, password, ...resto }) => ({
        id: _id.toString(),
        ...resto,
      }),
    },
  },
);

usuarioSchema.statics.obtenerTodos = function () {
  return this.find().sort({ _id: 1 });
};

usuarioSchema.statics.obtenerPorId = function (id) {
  return this.findById(id);
};

usuarioSchema.statics.obtenerPorEmail = function (email) {
  return this.findOne({ email: String(email).trim().toLowerCase() });
};

usuarioSchema.statics.crear = function (datos) {
  return this.create(datos);
};

// Carga el usuario, aplica los cambios y guarda: así corren las validaciones del schema.
usuarioSchema.statics.actualizar = async function (id, cambios) {
  const usuario = await this.findById(id);

  if (!usuario) return null;

  usuario.set(cambios);

  return usuario.save();
};

const Usuario = mongoose.models.Usuario || mongoose.model("Usuario", usuarioSchema);

export default Usuario;

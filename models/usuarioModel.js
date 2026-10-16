import mongoose from "mongoose";

export const ESTADOS_USUARIO = {
  ACTIVO: "activo",
  INACTIVO: "inactivo",
};

export const ESTADOS_VALIDOS = Object.values(ESTADOS_USUARIO);

const usuarioSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
    },
    apellido: {
      type: String,
      required: [true, "El apellido es obligatorio"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "El email es obligatorio"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    telefono: { type: String, trim: true },
    // Sin encriptar por ahora: la encriptación queda para la entrega final.
    password: {
      type: String,
      required: [true, "La contraseña es obligatoria"],
    },
    estado: {
      type: String,
      enum: {
        values: ESTADOS_VALIDOS,
        message: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(", ")}`,
      },
      default: ESTADOS_USUARIO.ACTIVO,
    },
  },
  {
    versionKey: false,
    toJSON: {
      // Se responde `id` en lugar de `_id`, y la password nunca se devuelve.
      transform: (doc, { _id, password, ...resto }) => ({
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

usuarioSchema.statics.crear = function (data) {
  return this.create(data);
};

// Carga el usuario, aplica los cambios y guarda: así corren las validaciones del schema.
usuarioSchema.statics.actualizar = async function (id, cambios) {
  const usuario = await this.findById(id);
  if (!usuario) return null;
  usuario.set(cambios);
  return usuario.save();
};

const Usuario = mongoose.model("Usuario", usuarioSchema);

export default Usuario;

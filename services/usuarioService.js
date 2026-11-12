import bcrypt from "bcryptjs";
import Usuario from "../models/usuarioModel.js";
import { NotFoundError, ConflictError } from "../errors/errores.js";

// Campos que se pueden modificar. El estado y el rol tienen endpoints propios.
const CAMPOS_EDITABLES = ["nombre", "apellido", "email", "telefono", "password"];

const HASH_ROUNDS = 10;

/**
 * Obtiene todos los usuarios.
 */
const obtenerTodos = async () => {
  return await Usuario.obtenerTodos();
};

/**
 * Obtiene un usuario por su ID.
 */
const obtenerPorId = async (id) => {
  const usuario = await Usuario.obtenerPorId(id);

  if (!usuario) {
    throw new NotFoundError("Usuario no encontrado");
  }

  return usuario;
};

/**
 * Crea un usuario y hashea su contraseña.
 */
const crear = async (datos) => {
  const { nombre, apellido, email, telefono, password } = datos;

  // Regla de negocio: evitar emails duplicados.
  const emailExistente = await Usuario.obtenerPorEmail(email);

  if (emailExistente) {
    throw new ConflictError("El email ya se encuentra registrado");
  }

  const passwordHash = await bcrypt.hash(password, HASH_ROUNDS);

  return await Usuario.crear({
    nombre,
    apellido,
    email,
    telefono,
    password: passwordHash,
  });
};

/**
 * Actualiza los datos editables de un usuario.
 */
const actualizar = async (id, datos) => {
  const usuarioExistente = await obtenerPorId(id);

  // Solo se aplican los campos editables.
  const cambios = Object.fromEntries(
    CAMPOS_EDITABLES.filter((campo) => datos[campo] !== undefined).map((campo) => [
      campo,
      datos[campo],
    ]),
  );

  // Si cambia el email, verificar que no pertenezca a otro usuario.
  if (cambios.email && String(cambios.email).trim().toLowerCase() !== usuarioExistente.email) {
    const emailDuplicado = await Usuario.obtenerPorEmail(cambios.email);

    if (emailDuplicado) {
      throw new ConflictError("El nuevo email ya está en uso por otro usuario");
    }
  }

  // Si cambia la contraseña, hashearla antes de persistirla.
  if (cambios.password) {
    cambios.password = await bcrypt.hash(cambios.password, HASH_ROUNDS);
  }

  return await Usuario.actualizar(id, cambios);
};

/**
 * Cambia el estado de un usuario.
 */
const cambiarEstado = async (id, estado) => {
  const usuario = await Usuario.actualizar(id, { estado });

  if (!usuario) {
    throw new NotFoundError("Usuario no encontrado");
  }

  return usuario;
};

/**
 * Cambia el rol de un usuario.
 */
const cambiarRol = async (id, rol) => {
  const usuario = await Usuario.actualizar(id, { rol });

  if (!usuario) {
    throw new NotFoundError("Usuario no encontrado");
  }

  return usuario;
};

export { obtenerTodos, obtenerPorId, crear, actualizar, cambiarEstado, cambiarRol };

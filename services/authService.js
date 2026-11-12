import bcrypt from "bcryptjs";
import Usuario from "../models/usuarioModel.js";
import { ESTADOS_USUARIO } from "../definitions/usuario.js";
import { UnauthorizedError, ForbiddenError } from "../errors/errores.js";
import { generarToken } from "../utils/jwt.js";

/**
 * Verifica las credenciales e inicia la autenticación del usuario.
 */
const login = async (email, password) => {
  const usuario = await Usuario.obtenerPorEmail(email);

  // Mismo error si el usuario no existe o la contraseña no coincide.
  const passwordCorrecta = usuario && (await bcrypt.compare(password, usuario.password));

  if (!passwordCorrecta) {
    throw new UnauthorizedError("Credenciales incorrectas");
  }

  // Solo se informa que está inactivo a quien presentó credenciales correctas.
  if (usuario.estado === ESTADOS_USUARIO.INACTIVO) {
    throw new ForbiddenError("El usuario se encuentra inactivo");
  }

  const token = generarToken(usuario);

  return { usuario, token };
};

export { login };


import bcrypt from "bcryptjs";
import Usuario from "../models/usuarioModel.js";
import { ESTADOS_USUARIO } from "../definitions/usuario.js";
import {
  UnauthorizedError,
  ForbiddenError,
} from "../errors/errores.js";
import { generarToken, verificarToken } from "../utils/jwt.js";

/**
 * Verifica las credenciales e inicia la autenticación del usuario.
 */
export const login = async (email, password) => {
  const usuario = await Usuario.obtenerPorEmail(email);

  // Mismo error si el usuario no existe o la contraseña no coincide.
  const passwordCorrecta =
    usuario && (await bcrypt.compare(password, usuario.password));

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

/**
 * Obtiene el usuario asociado a un token y verifica que su sesión
 * siga siendo válida.
 *
 * La utilizan los middlewares HTTP y el handshake de Socket.IO.
 */
export const obtenerUsuarioDesdeToken = async (token) => {
  if (!token) {
    throw new UnauthorizedError("No hay sesión iniciada");
  }

  const payload = verificarToken(token);

  if (!payload || !payload.id) {
    throw new UnauthorizedError("Token inválido o expirado");
  }

  const usuario = await Usuario.obtenerPorId(payload.id);

  if (!usuario) {
    throw new UnauthorizedError("Usuario no encontrado");
  }

  if (usuario.estado !== ESTADOS_USUARIO.ACTIVO) {
    throw new ForbiddenError("El usuario se encuentra inactivo");
  }

  return {
    usuario,
    expiraEn: payload.exp * 1000,
  };
};

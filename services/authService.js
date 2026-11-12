import Usuario, { ESTADOS_USUARIO } from "../models/usuarioModel.js";
import { verificarToken } from "../utils/jwt.js";
import { UnauthorizedError, ForbiddenError } from "../errors/errores.js";

// Lógica compartida de verificación de sesión.
// La usan el middleware HTTP (autenticar, autenticarOpcional) y el handshake
// de Socket.IO (F10.2). No conoce ni req/res ni sockets: recibe un token y
// devuelve el usuario, o lanza un error controlado.
export async function obtenerUsuarioDesdeToken(token) {
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

  return { usuario, expiraEn: payload.exp * 1000 };
}
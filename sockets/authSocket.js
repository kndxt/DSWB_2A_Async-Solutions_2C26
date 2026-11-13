import { NOMBRE_COOKIE } from "../utils/cookies.js";
import { obtenerUsuarioDesdeToken } from "../services/authService.js";
import { UnauthorizedError, ForbiddenError } from "../errors/errores.js";
import traducirError from "../errors/traducirError.js";

// Extrae el valor de la cookie del header crudo. cookie-parser no actúa
// sobre sockets, así que socket.handshake.headers.cookie llega como string.
function extraerTokenDeCookie(cookieHeader) {
  if (!cookieHeader) return null;

  const par = cookieHeader
    .split(";")
    .map((parte) => parte.trim())
    .find((parte) => parte.startsWith(`${NOMBRE_COOKIE}=`));

  return par ? decodeURIComponent(par.slice(NOMBRE_COOKIE.length + 1)) : null;
}

// Middleware de handshake: valida el JWT antes de aceptar la conexión.
// Guarda en socket.data la identidad mínima y los datos necesarios para
// revalidar más adelante. No acepta identidad enviada por el cliente.
export function registrarAuth(io) {
  io.use(async (socket, next) => {
    try {
      const token = extraerTokenDeCookie(socket.handshake.headers.cookie);
      const { usuario, expiraEn } = await obtenerUsuarioDesdeToken(token);

      socket.data.usuario = {
        id: usuario.id,
        nombre: `${usuario.nombre} ${usuario.apellido}`.trim(),
        rol: usuario.rol,
      };
      socket.data.expiraEn = expiraEn;
      socket.data.token = token;

      next();
    } catch (err) {
      const error = traducirError(err);
      // Los errores de autenticación reciben un mensaje genérico.
      if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
        return next(new Error("No autorizado"));
      }

      // Los errores inesperados se registran en el servidor.
      console.error("Error al autenticar conexión Socket.IO:", error);

      // No se exponen detalles internos al cliente.
      return next(new Error("No se pudo validar la conexión"));
    }
  });
}

// Revalida la sesión antes de aceptar un mensaje.
// Verifica que el token no haya vencido y que el usuario siga activo.
// Si falla, emite chat:sesion-expirada y desconecta el socket.
export async function revalidarSocket(socket) {
  if (Date.now() >= socket.data.expiraEn) {
    throw new UnauthorizedError("La sesión expiró");
  }

  await obtenerUsuarioDesdeToken(socket.data.token);

  return true;
}

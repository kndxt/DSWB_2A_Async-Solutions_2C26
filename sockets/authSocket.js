import { NOMBRE_COOKIE } from "../utils/cookies.js";
import { obtenerUsuarioDesdeToken } from "../services/authService.js";
import { EVENTOS } from "./eventos.js";

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
    } catch {
      // El cliente recibe este error como "connect_error". No se filtra
      // el motivo real (token inválido, usuario inactivo, etc.).
      next(new Error("No autorizado"));
    }
  });
}

// Revalida la sesión antes de aceptar un mensaje.
// Verifica que el token no haya vencido y que el usuario siga activo.
// Si falla, emite chat:sesion-expirada y desconecta el socket.
export async function revalidarSocket(socket) {
  if (Date.now() >= socket.data.expiraEn) {
    socket.emit(EVENTOS.SESION_EXPIRADA);
    socket.disconnect();
    return false;
  }

  try {
    await obtenerUsuarioDesdeToken(socket.data.token);
    return true;
  } catch {
    socket.emit(EVENTOS.SESION_EXPIRADA);
    socket.disconnect();
    return false;
  }
}
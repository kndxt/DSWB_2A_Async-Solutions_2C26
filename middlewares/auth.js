import { leerCookieToken } from "../utils/cookies.js";
import { obtenerUsuarioDesdeToken } from "../services/authService.js";
import { AppError, UnauthorizedError, ForbiddenError } from "../errors/errores.js";
import asyncHandler from "./asyncHandler.js";

/**
 * Verifica que haya un token válido en la cookie, que el usuario exista
 * y que se encuentre activo. Si todo está bien, deja el usuario en req.usuario.
 */
export const autenticar = asyncHandler(async (req, res, next) => {
  const token = leerCookieToken(req);

  try {
    const { usuario } = await obtenerUsuarioDesdeToken(token);
    req.usuario = usuario;
    next();
  } catch (error) {
    // Se preserva el contrato HTTP actual: errores de auth responden JSON
    // directo, no pasan por errorHandler (los tests dependen de esto).
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({ error: error.message });
    }
    if (error instanceof ForbiddenError) {
      return res.status(403).json({ error: error.message });
    }
    // Cualquier otro error (DB, timeout) se propaga a errorHandler.
    throw error;
  }
});

/**
 * Verifica que el usuario autenticado tenga uno de los roles permitidos.
 * Debe usarse siempre después de `autenticar`.
 */
export const autorizar = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: "No hay sesión iniciada" });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res
        .status(403)
        .json({ error: "No tenés permiso para realizar esta acción" });
    }

    next();
  };
};

/**
 * Versión opcional de `autenticar`: si no hay token o es inválido,
 * continúa sin usuario. Se usa en rutas de vistas para que el navbar
 * pueda mostrar "Iniciar sesión" o "Cerrar sesión" según el estado.
 */
export const autenticarOpcional = asyncHandler(async (req, res, next) => {
  const token = leerCookieToken(req);

  try {
    const { usuario } = await obtenerUsuarioDesdeToken(token);
    req.usuario = usuario;
    res.locals.usuario = usuario;
  } catch (error) {
    // Solo se silencian los errores controlados de auth. Un error de DB
    // debe llegar al errorHandler para no ocultar fallos reales.
    if (!(error instanceof AppError)) throw error;
    res.locals.usuario = null;
  }

  next();
});
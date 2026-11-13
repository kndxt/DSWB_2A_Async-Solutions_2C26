
import { leerCookieToken } from "../utils/cookies.js";
import { obtenerUsuarioDesdeToken } from "../services/authService.js";
import { UnauthorizedError, ForbiddenError } from "../errors/errores.js";
import asyncHandler from "./asyncHandler.js";

/**
 * Verifica que haya un token válido en la cookie, que el usuario exista
 * y que se encuentre activo. Si todo está bien, deja el usuario en req.usuario.
 */
export const autenticar = asyncHandler(async (req, res, next) => {
  const token = leerCookieToken(req);
  const { usuario } = await obtenerUsuarioDesdeToken(token);

  req.usuario = usuario;
  next();
});

/**
 * Verifica que el usuario autenticado tenga uno de los roles permitidos.
 * Debe usarse siempre después de `autenticar`.
 */
export const autorizar = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      throw new UnauthorizedError("No hay sesión iniciada");
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      throw new ForbiddenError("No tenés permiso para realizar esta acción");
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
    // Solo se silencian errores controlados de autenticación.
    // Los errores de infraestructura deben llegar al errorHandler.
    if (!(error instanceof UnauthorizedError || error instanceof ForbiddenError)) {
      throw error;
    }

    res.locals.usuario = null;
  }

  next();
});

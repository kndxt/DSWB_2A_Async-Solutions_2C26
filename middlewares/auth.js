import Usuario, { ESTADOS_USUARIO } from "../models/usuarioModel.js";
import { verificarToken } from "../utils/jwt.js";
import { leerCookieToken } from "../utils/cookies.js";
import asyncHandler from "./asyncHandler.js";

/**
 * Verifica que haya un token válido en la cookie, que el usuario exista
 * y que se encuentre activo. Si todo está bien, deja el usuario en req.usuario.
 */
export const autenticar = asyncHandler(async (req, res, next) => {
  const token = leerCookieToken(req);

  if (!token) {
    return res.status(401).json({ error: "No hay sesión iniciada" });
  }

  const payload = verificarToken(token);
  if (!payload || !payload.id) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }

  const usuario = await Usuario.obtenerPorId(payload.id);
  if (!usuario) {
    return res.status(401).json({ error: "Usuario no encontrado" });
  }

  if (usuario.estado !== ESTADOS_USUARIO.ACTIVO) {
    return res.status(403).json({ error: "El usuario se encuentra inactivo" });
  }

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

  if (!token) {
    res.locals.usuario = null;
    return next();
  }

  const payload = verificarToken(token);
  if (!payload || !payload.id) {
    res.locals.usuario = null;
    return next();
  }

  const usuario = await Usuario.obtenerPorId(payload.id);
  if (!usuario || usuario.estado !== ESTADOS_USUARIO.ACTIVO) {
    res.locals.usuario = null;
    return next();
  }

  req.usuario = usuario;
  res.locals.usuario = usuario;
  next();
});
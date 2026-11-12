import express from "express";
import * as usuarioController from "../controllers/usuarioController.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import validarDatos from "../middlewares/validarDatos.js";
import { autenticar, autorizar } from "../middlewares/auth.js";
import { usuarioDefinicion, ROLES_USUARIO } from "../definitions/usuario.js";

const router = express.Router();

const { operaciones } = usuarioDefinicion;
const validarUsuario = validarDatos(usuarioDefinicion);

// Middlewares reutilizables.
const soloAdmin = [autenticar, autorizar(ROLES_USUARIO.ADMIN)];

// Públicas: registro e inicio de sesión
router.post("/", validarUsuario(operaciones.crear), asyncHandler(usuarioController.crearUsuario));
router.post("/login", validarUsuario(operaciones.login), asyncHandler(usuarioController.login));

// Autenticadas: cerrar sesión (cualquier usuario logueado)
router.post("/logout", autenticar, asyncHandler(usuarioController.logout));

// Solo administradores.
router.get("/", ...soloAdmin, asyncHandler(usuarioController.obtenerUsuarios));

router.get(
  "/:id",
  ...soloAdmin,
  validarUsuario(operaciones.obtenerPorId),
  asyncHandler(usuarioController.obtenerUsuarioPorId),
);

router.put(
  "/:id",
  ...soloAdmin,
  validarUsuario(operaciones.actualizar),
  asyncHandler(usuarioController.actualizarUsuario),
);

router.patch(
  "/:id/estado",
  ...soloAdmin,
  validarUsuario(operaciones.cambiarEstado),
  asyncHandler(usuarioController.cambiarEstadoUsuario),
);

router.patch(
  "/:id/rol",
  ...soloAdmin,
  validarUsuario(operaciones.cambiarRol),
  asyncHandler(usuarioController.cambiarRolUsuario),
);

export default router;

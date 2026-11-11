import express from "express";
import * as usuarioController from "../controllers/usuarioController.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import validarIds from "../middlewares/validarIds.js";
import { autenticar, autorizar } from "../middlewares/auth.js";
import { ROLES_USUARIO } from "../models/usuarioModel.js";

const router = express.Router();

// Públicas: registro e inicio de sesión
router.post("/", asyncHandler(usuarioController.crearUsuario));
router.post("/login", asyncHandler(usuarioController.login));

// Autenticadas: cerrar sesión (cualquier usuario logueado)
router.post("/logout", autenticar, asyncHandler(usuarioController.logout));

// Solo admin: listar, ver, actualizar y cambiar estado
router.get(
  "/",
  autenticar,
  autorizar(ROLES_USUARIO.ADMIN),
  asyncHandler(usuarioController.obtenerUsuarios),
);

router.get(
  "/:id",
  autenticar,
  autorizar(ROLES_USUARIO.ADMIN),
  validarIds("params", "id"),
  asyncHandler(usuarioController.obtenerUsuarioPorId),
);

router.put(
  "/:id",
  autenticar,
  autorizar(ROLES_USUARIO.ADMIN),
  validarIds("params", "id"),
  asyncHandler(usuarioController.actualizarUsuario),
);

router.patch(
  "/:id/estado",
  autenticar,
  autorizar(ROLES_USUARIO.ADMIN),
  validarIds("params", "id"),
  asyncHandler(usuarioController.cambiarEstadoUsuario),
);

export default router;
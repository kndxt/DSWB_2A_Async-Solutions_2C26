import express from "express";
import * as usuarioController from "../controllers/usuarioController.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import validarIds from "../middlewares/validarIds.js";

const router = express.Router();

router.get("/", asyncHandler(usuarioController.obtenerUsuarios));
router.get(
  "/:id",
  validarIds("params", "id"),
  asyncHandler(usuarioController.obtenerUsuarioPorId),
);
router.post("/", asyncHandler(usuarioController.crearUsuario));
router.put(
  "/:id",
  validarIds("params", "id"),
  asyncHandler(usuarioController.actualizarUsuario),
);
router.patch(
  "/:id/estado",
  validarIds("params", "id"),
  asyncHandler(usuarioController.cambiarEstadoUsuario),
);

export default router;

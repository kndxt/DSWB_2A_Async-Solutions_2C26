import express from "express";
import * as eventoController from "../controllers/eventoController.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import validarDatos from "../middlewares/validarDatos.js";
import { eventoDefinicion } from "../definitions/evento.js";
import { autenticar, autorizar } from "../middlewares/auth.js";
import { ROLES_USUARIO } from "../definitions/usuario.js";

const router = express.Router();

const { operaciones } = eventoDefinicion;
const validarEvento = validarDatos(eventoDefinicion);

// Lectura: cualquier usuario autenticado
router.get("/", asyncHandler(eventoController.obtenerEventos));

router.get("/proximos", asyncHandler(eventoController.obtenerEventosProximos));

router.get(
  "/:id",
  validarEvento(operaciones.obtenerPorId),
  asyncHandler(eventoController.obtenerEventoPorId),
);

// Escritura: solo admin
router.post(
  "/",
  autenticar,
  autorizar(ROLES_USUARIO.ADMIN),
  validarEvento(operaciones.crear),
  asyncHandler(eventoController.crearEvento),
);

router.patch(
  "/:id",
  autenticar,
  autorizar(ROLES_USUARIO.ADMIN),
  validarEvento(operaciones.actualizar),
  asyncHandler(eventoController.actualizarEvento),
);

export default router;

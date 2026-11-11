import express from "express";
import * as eventoController from "../controllers/eventoController.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import validarDatos from "../middlewares/validarDatos.js";
import { eventoDefinicion } from "../definitions/evento.js";

const router = express.Router();

const { operaciones } = eventoDefinicion;
const validarEvento = validarDatos(eventoDefinicion);

router.get("/", asyncHandler(eventoController.obtenerEventos));

router.get("/proximos", asyncHandler(eventoController.obtenerEventosProximos));

router.get(
  "/:id",
  validarEvento(operaciones.obtenerPorId),
  asyncHandler(eventoController.obtenerEventoPorId),
);

router.post("/", validarEvento(operaciones.crear), asyncHandler(eventoController.crearEvento));

router.patch(
  "/:id",
  validarEvento(operaciones.actualizar),
  asyncHandler(eventoController.actualizarEvento),
);

export default router;

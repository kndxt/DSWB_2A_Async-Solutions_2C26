import express from "express";
import * as salaController from "../controllers/salaController.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import validarDatos from "../middlewares/validarDatos.js";
import { salaDefinicion } from "../definitions/sala.js";

const router = express.Router();

const validarSala = validarDatos(salaDefinicion);

router.get("/", asyncHandler(salaController.obtenerSalas));

router.get(
  "/:id",
  validarSala(salaDefinicion.operaciones.obtenerPorId),
  asyncHandler(salaController.obtenerSalaPorId),
);

router.post(
  "/",
  validarSala(salaDefinicion.operaciones.crear),
  asyncHandler(salaController.crearSala),
);

router.patch(
  "/:id",
  validarSala(salaDefinicion.operaciones.actualizar),
  asyncHandler(salaController.actualizarSala),
);

export default router;

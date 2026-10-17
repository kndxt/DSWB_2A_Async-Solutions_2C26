import express from "express";
import * as eventoController from "../controllers/eventoController.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import validarIds from "../middlewares/validarIds.js";

const router = express.Router();

router.get("/", asyncHandler(eventoController.obtenerEventos));
router.get("/proximos", asyncHandler(eventoController.obtenerEventosProximos));
router.get("/:id", validarIds("params", "id"), asyncHandler(eventoController.obtenerEventoPorId));
router.post("/", validarIds("body", "salaId", "usuarioId"), asyncHandler(eventoController.crearEvento));
router.put("/:id", validarIds("params", "id"), asyncHandler(eventoController.actualizarEvento));

export default router;
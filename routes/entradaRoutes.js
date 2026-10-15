import express from "express";
import asyncHandler from "../middlewares/asyncHandler.js";
import validarIds from "../middlewares/validarIds.js";

import {
  obtenerEntradas,
  obtenerVendidasPorEvento,
  obtenerDisponiblesPorEvento,
  obtenerEntradaPorId,
  venderEntrada,
  cancelarEntrada,
} from "../controllers/entradaController.js";

const router = express.Router();

router.get("/", asyncHandler(obtenerEntradas));

router.get("/vendidas/:eventoId", validarIds("params", "eventoId"), asyncHandler(obtenerVendidasPorEvento));

router.get("/disponibles/:eventoId", validarIds("params", "eventoId"), asyncHandler(obtenerDisponiblesPorEvento));

router.get("/:id", validarIds("params", "id"), asyncHandler(obtenerEntradaPorId));

router.post("/", validarIds("body", "eventoId", "usuarioId") , asyncHandler(venderEntrada));

router.patch("/:id/cancelar", validarIds("params", "id"), asyncHandler(cancelarEntrada));

export default router;
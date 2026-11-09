import express from "express";
import asyncHandler from "../middlewares/asyncHandler.js";
import validarDatos from "../middlewares/validarDatos.js";
import { entradaDefinicion } from "../definitions/entrada.js";

import {
  obtenerEntradas,
  obtenerVendidasPorEvento,
  obtenerDisponiblesPorEvento,
  obtenerEntradaPorId,
  venderEntrada,
  cancelarEntrada,
} from "../controllers/entradaController.js";

const router = express.Router();

const { operaciones } = entradaDefinicion;
const validarEntrada = validarDatos(entradaDefinicion);

router.get("/", asyncHandler(obtenerEntradas));

router.get("/vendidas/:eventoId", validarEntrada(operaciones.obtenerVendidasPorEvento), asyncHandler(obtenerVendidasPorEvento));

router.get("/disponibles/:eventoId", validarEntrada(operaciones.obtenerDisponiblesPorEvento), asyncHandler(obtenerDisponiblesPorEvento));

router.get("/:id", validarEntrada(operaciones.obtenerPorId), asyncHandler(obtenerEntradaPorId));

router.post("/", validarEntrada(operaciones.vender), asyncHandler(venderEntrada));

router.patch("/:id/cancelar", validarEntrada(operaciones.cancelar), asyncHandler(cancelarEntrada));

export default router;
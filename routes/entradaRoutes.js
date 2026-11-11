import express from "express";
import asyncHandler from "../middlewares/asyncHandler.js";
import validarDatos from "../middlewares/validarDatos.js";
import { entradaDefinicion } from "../definitions/entrada.js";
import { autenticar } from "../middlewares/auth.js";

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

// Todas las rutas requieren sesión iniciada (cliente o admin)
router.get("/", autenticar, asyncHandler(obtenerEntradas));

router.get(
  "/vendidas/:eventoId",
  autenticar,
  validarEntrada(operaciones.obtenerVendidasPorEvento),
  asyncHandler(obtenerVendidasPorEvento),
);

router.get(
  "/disponibles/:eventoId",
  autenticar,
  validarEntrada(operaciones.obtenerDisponiblesPorEvento),
  asyncHandler(obtenerDisponiblesPorEvento),
);

router.get(
  "/:id",
  autenticar,
  validarEntrada(operaciones.obtenerPorId),
  asyncHandler(obtenerEntradaPorId),
);

router.post(
  "/",
  autenticar,
  validarEntrada(operaciones.vender),
  asyncHandler(venderEntrada),
);

router.patch(
  "/:id/cancelar",
  autenticar,
  validarEntrada(operaciones.cancelar),
  asyncHandler(cancelarEntrada),
);

export default router;
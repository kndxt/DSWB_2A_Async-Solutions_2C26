import express from "express";

import {
  obtenerEntradas,
  obtenerVendidasPorEvento,
  obtenerDisponiblesPorEvento,
  obtenerEntradaPorId,
  venderEntrada,
  cancelarEntrada,
} from "../controllers/entradaController.js";

const router = express.Router();

router.get("/", obtenerEntradas);

router.get("/vendidas/:eventoId", obtenerVendidasPorEvento);

router.get("/disponibles/:eventoId", obtenerDisponiblesPorEvento);

router.get("/:id", obtenerEntradaPorId);

router.post("/", venderEntrada);

router.patch("/:id/cancelar", cancelarEntrada);

export default router;
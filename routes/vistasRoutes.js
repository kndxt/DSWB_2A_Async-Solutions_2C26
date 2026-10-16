import express from "express";
import asyncHandler from "../middlewares/asyncHandler.js";
import validarIds from "../middlewares/validarIds.js";

import {
    renderizarSalas,
    renderizarEventos, 
    renderizarEntradasPorEvento,
    renderizarEntradas,
} from "../controllers/vistasController.js";

const router = express.Router();

router.get("/salas", renderizarSalas);

router.get("/eventos", renderizarEventos);

router.get(
  "/entradas",
  renderizarEntradas
);

router.get("/entradas/:eventoId", validarIds("params", "eventoId"), asyncHandler(renderizarEntradasPorEvento));

export default router;
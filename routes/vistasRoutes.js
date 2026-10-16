import express from "express";
import asyncHandler from "../middlewares/asyncHandler.js";
import validarIds from "../middlewares/validarIds.js";

import {
    renderizarSalas,
    renderizarEventosProximos, 
    renderizarEntradasPorEvento,
    renderizarEntradas,
} from "../controllers/vistasController.js";

const router = express.Router();

router.get("/salas", renderizarSalas);

router.get("/eventos", asyncHandler(renderizarEventosProximos));

router.get(
  "/entradas",
  renderizarEntradas
);

router.get("/entradas/:eventoId", validarIds("params", "eventoId"), asyncHandler(renderizarEntradasPorEvento));

export default router;
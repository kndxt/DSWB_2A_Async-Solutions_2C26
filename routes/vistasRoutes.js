import express from "express";
import asyncHandler from "../middlewares/asyncHandler.js";
import validarIds from "../middlewares/validarIds.js";

import {
    renderizarEventosProximos, 
    renderizarEntradasPorEvento,
    renderizarFetchPrueba,
} from "../controllers/vistasController.js";

const router = express.Router();

router.get("/eventos", asyncHandler(renderizarEventosProximos));

router.get("/fetch-prueba", renderizarFetchPrueba);

router.get("/entradas/:eventoId", validarIds("params", "eventoId"), asyncHandler(renderizarEntradasPorEvento));

export default router;
import express from "express";
import asyncHandler from "../middlewares/asyncHandler.js";
import validarIds from "../middlewares/validarIds.js";

import {
    renderizarUsuarios, 
    renderizarSalas,
    renderizarEventos, 
    renderizarEntradasPorEvento,
    renderizarFetchPrueba,
    renderizarReservas,
} from "../controllers/vistasController.js";

const router = express.Router();

router.get("/usuarios", renderizarUsuarios);

router.get("/salas", renderizarSalas);

router.get("/eventos", renderizarEventos);

router.get("/fetch-prueba", renderizarFetchPrueba);

router.get("/entradas/:eventoId", validarIds("params", "eventoId"), asyncHandler(renderizarEntradasPorEvento));

router.get("/reservas", renderizarReservas);

export default router;
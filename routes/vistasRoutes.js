import express from "express";
import * as vistasController from "../controllers/vistasController.js";

const router = express.Router();

router.get("/eventos", vistasController.renderizarEventosProximos);

router.get("/fetch-prueba", vistasController.renderizarFetchPrueba);

router.get("/entradas/:eventoId", vistasController.renderizarEntradasPorEvento);

export default router;
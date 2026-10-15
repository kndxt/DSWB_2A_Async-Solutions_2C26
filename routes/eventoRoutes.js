import express from "express";
import * as eventoController from "../controllers/eventoController.js";

const router = express.Router();

router.get("/", eventoController.obtenerEventos);
router.get("/proximos", eventoController.obtenerEventosProximos);
router.get("/:id", eventoController.obtenerEventoPorId);
router.post("/", eventoController.crearEvento);
router.put("/:id", eventoController.actualizarEvento);

export default router;
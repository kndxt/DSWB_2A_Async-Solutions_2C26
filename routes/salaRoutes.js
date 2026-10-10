import express from "express";
import * as salaController from "../controllers/salaController.js";

const router = express.Router();

router.get("/", salaController.obtenerSalas);
router.get("/:id", salaController.obtenerSalaPorId);
router.post("/", salaController.crearSala);
router.put("/:id", salaController.actualizarSala);

export default router;
import express from "express";
import * as salaController from "../controllers/salaController.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import validarIds from "../middlewares/validarIds.js";

const router = express.Router();

router.get("/", asyncHandler(salaController.obtenerSalas));
router.get("/:id", validarIds("params", "id"), asyncHandler(salaController.obtenerSalaPorId));
router.post("/", asyncHandler(salaController.crearSala));
router.put("/:id", validarIds("params", "id"), asyncHandler(salaController.actualizarSala));

export default router;
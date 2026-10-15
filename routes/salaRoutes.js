import express from "express";
import * as salaController from "../controllers/salaController.js";
import asyncHandler from "../middlewares/asyncHandler.js";

const router = express.Router();

router.get("/", asyncHandler(salaController.obtenerSalas));
router.get("/:id", asyncHandler(salaController.obtenerSalaPorId));
router.post("/", asyncHandler(salaController.crearSala));
router.put("/:id", asyncHandler(salaController.actualizarSala));

export default router;
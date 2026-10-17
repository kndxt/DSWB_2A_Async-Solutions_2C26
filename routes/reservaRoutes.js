import express from "express";
import asyncHandler from "../middlewares/asyncHandler.js";
import validarIds from "../middlewares/validarIds.js";
import {
  obtenerReservas,
  obtenerReservaPorEvento,
} from "../controllers/reservaController.js";

const router = express.Router();

router.get("/", asyncHandler(obtenerReservas));

router.get(
  "/:eventoId",
  validarIds("params", "eventoId"),
  asyncHandler(obtenerReservaPorEvento),
);

export default router;
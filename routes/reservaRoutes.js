import express from "express";
import asyncHandler from "../middlewares/asyncHandler.js";
import validarDatos from "../middlewares/validarDatos.js";
import { reservaDefinicion } from "../definitions/reserva.js";
import { obtenerReservas, obtenerReservaPorEvento } from "../controllers/reservaController.js";

const router = express.Router();

const { operaciones } = reservaDefinicion;
const validarReserva = validarDatos(reservaDefinicion);

router.get("/", asyncHandler(obtenerReservas));

router.get(
  "/:eventoId",
  validarReserva(operaciones.obtenerPorEvento),
  asyncHandler(obtenerReservaPorEvento),
);

export default router;

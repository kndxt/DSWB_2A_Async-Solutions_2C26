import express from "express";
import asyncHandler from "../middlewares/asyncHandler.js";
import validarDatos from "../middlewares/validarDatos.js";
import { reservaDefinicion } from "../definitions/reserva.js";
import { autenticar } from "../middlewares/auth.js";
import { obtenerReservas, obtenerReservaPorEvento } from "../controllers/reservaController.js";

const router = express.Router();

const { operaciones } = reservaDefinicion;
const validarReserva = validarDatos(reservaDefinicion);

// Todas las rutas requieren sesión iniciada
router.get(
  "/",
  autenticar,
  validarReserva(operaciones.obtenerTodos),
  asyncHandler(obtenerReservas),
);

router.get(
  "/:eventoId",
  autenticar,
  validarReserva(operaciones.obtenerPorEvento),
  asyncHandler(obtenerReservaPorEvento),
);

export default router;

import express from "express";
import asyncHandler from "../middlewares/asyncHandler.js";
import validarDatos from "../middlewares/validarDatos.js";
import { reservaDefinicion } from "../definitions/reserva.js";
import { autenticar } from "../middlewares/auth.js";
import { obtenerReservas, obtenerReservaPorEvento } from "../controllers/reservaController.js";

const router = express.Router();

const { operaciones } = reservaDefinicion;
const validarReserva = validarDatos(reservaDefinicion);

// Todas las consultas de reservas requieren una sesión iniciada.
// Los permisos de consulta dependen del rol y la titularidad.
router.use(autenticar);

router.get("/", validarReserva(operaciones.obtenerTodos), asyncHandler(obtenerReservas));

router.get(
  "/:eventoId",
  validarReserva(operaciones.obtenerPorEvento),
  asyncHandler(obtenerReservaPorEvento),
);

export default router;

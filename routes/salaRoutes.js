import express from "express";
import * as salaController from "../controllers/salaController.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import validarDatos from "../middlewares/validarDatos.js";
import { salaDefinicion } from "../definitions/sala.js";
import { autenticar, autorizar } from "../middlewares/auth.js";
import { ROLES_USUARIO } from "../models/usuarioModel.js";

const router = express.Router();

const { operaciones } = salaDefinicion;
const validarSala = validarDatos(salaDefinicion);

// Todas las operaciones de salas son exclusivas de administradores.
router.use(autenticar, autorizar(ROLES_USUARIO.ADMIN));

// Lectura: cualquier usuario autenticado
router.get("/", asyncHandler(salaController.obtenerSalas));

router.get(
  "/:id",
  validarSala(operaciones.obtenerPorId),
  asyncHandler(salaController.obtenerSalaPorId),
);

// Escritura: solo admin
router.post("/", validarSala(operaciones.crear), asyncHandler(salaController.crearSala));

router.patch(
  "/:id",
  validarSala(operaciones.actualizar),
  asyncHandler(salaController.actualizarSala),
);

export default router;

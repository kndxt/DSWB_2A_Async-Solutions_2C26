import express from "express";
import asyncHandler from "../middlewares/asyncHandler.js";
import validarDatos from "../middlewares/validarDatos.js";
import { entradaDefinicion } from "../definitions/entrada.js";
import { autenticar, autorizar } from "../middlewares/auth.js";
import { ROLES_USUARIO } from "../models/usuarioModel.js";
import { autenticarOpcional } from "../middlewares/auth.js";

import {
  renderizarUsuarios,
  renderizarSalas,
  renderizarEventos,
  renderizarEntradasPorEvento,
  renderizarReservas,
  renderizarEntradas,
  renderizarLogin,
  renderizarRegistro,
  renderizarInicio,
} from "../controllers/vistasController.js";

const router = express.Router();
const { operaciones } = entradaDefinicion;
const validarVista = validarDatos(entradaDefinicion);

// Carga el usuario actual (si hay sesión) en res.locals.usuario.
router.use(autenticarOpcional);

router.get("/usuarios", renderizarUsuarios);
router.get("/salas", renderizarSalas);
router.get("/eventos", renderizarEventos);
router.get("/entradas", renderizarEntradas);
router.get("/login", renderizarLogin);
router.get("/registro", renderizarRegistro);
router.get("/inicio", renderizarInicio);

// el id del evento.
router.get(
  "/entradas/:eventoId",
  autenticar,
  autorizar(ROLES_USUARIO.ADMIN),
  validarVista(operaciones.obtenerResumenPorEvento),
  asyncHandler(renderizarEntradasPorEvento),
);

router.get("/reservas", renderizarReservas);

export default router;
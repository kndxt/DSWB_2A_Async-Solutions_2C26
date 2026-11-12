import express from "express";
import asyncHandler from "../middlewares/asyncHandler.js";
import validarIds from "../middlewares/validarIds.js";
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

// Carga el usuario actual (si hay sesión) en res.locals.usuario.
router.use(autenticarOpcional);

router.get("/usuarios", renderizarUsuarios);
router.get("/salas", renderizarSalas);
router.get("/eventos", renderizarEventos);
router.get("/entradas", renderizarEntradas);
router.get("/login", renderizarLogin);
router.get("/registro", renderizarRegistro);
router.get("/inicio", renderizarInicio);

router.get(
  "/entradas/:eventoId",
  validarIds("params", "eventoId"),
  asyncHandler(renderizarEntradasPorEvento),
);

router.get("/reservas", renderizarReservas);

export default router;
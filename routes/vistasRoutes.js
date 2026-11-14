import express from "express";
import asyncHandler from "../middlewares/asyncHandler.js";
import validarDatos from "../middlewares/validarDatos.js";
import { entradaDefinicion } from "../definitions/entrada.js";
import {
  autenticar,
  autorizar,
  autenticarOpcional,
  requerirSesionVista,
} from "../middlewares/auth.js";
import { ROLES_USUARIO } from "../definitions/usuario.js";

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

// Solo administradores
router.get(
  "/usuarios",
  autenticarOpcional,
  requerirSesionVista,
  autorizar(ROLES_USUARIO.ADMIN),
  renderizarUsuarios,
);
router.get(
  "/salas",
  autenticarOpcional,
  requerirSesionVista,
  autorizar(ROLES_USUARIO.ADMIN),
  renderizarSalas,
);

// Cualquier usuario con sesión
router.get("/eventos", autenticarOpcional, requerirSesionVista, renderizarEventos);
router.get("/entradas", autenticarOpcional, requerirSesionVista, renderizarEntradas);
router.get("/reservas", autenticarOpcional, requerirSesionVista, renderizarReservas);

// Públicas: visitantes
router.get("/login", autenticarOpcional, renderizarLogin);
router.get("/registro", autenticarOpcional, renderizarRegistro);
router.get("/inicio", autenticarOpcional, renderizarInicio);

router.get(
  "/entradas/:eventoId",
  autenticar,
  autorizar(ROLES_USUARIO.ADMIN),
  validarVista(operaciones.obtenerResumenPorEvento),
  asyncHandler(renderizarEntradasPorEvento),
);

router.get("/reservas", autenticarOpcional, renderizarReservas);

export default router;

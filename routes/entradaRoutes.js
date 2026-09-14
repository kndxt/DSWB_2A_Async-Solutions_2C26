const express = require("express");

const router = express.Router();

const entradaController = require("../controllers/entradaController");

router.get("/", entradaController.obtenerEntradas);

router.get("/vendidas/:eventoId", entradaController.obtenerVendidasPorEvento);

router.get("/disponibles/:eventoId", entradaController.obtenerDisponiblesPorEvento);

router.get("/:id", entradaController.obtenerEntradaPorId);

router.post("/", entradaController.venderEntrada);

router.patch("/:id/cancelar", entradaController.cancelarEntrada);

module.exports = router;
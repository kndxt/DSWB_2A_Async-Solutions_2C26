const express = require("express");

const router = express.Router();

const entradaController = require("../controllers/entradaController");

router.get("/", entradaController.obtenerEntradas);

router.get("/:id", entradaController.obtenerEntradaPorId);

router.post("/", entradaController.venderEntrada);

router.patch("/:id/cancelar", entradaController.cancelarEntrada);

module.exports = router;
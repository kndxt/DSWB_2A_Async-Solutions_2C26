const express = require("express");
const router = express.Router();
const vistasController = require("../controllers/vistasController");

router.get("/eventos", vistasController.renderizarEventosProximos);

router.get("/entradas/:eventoId", vistasController.renderizarEntradasPorEvento);

module.exports = router;
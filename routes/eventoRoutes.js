const express = require("express");
const router = express.Router();
const eventoController = require("../controllers/eventoController");

router.get("/", eventoController.obtenerEventos);
router.get("/proximos", eventoController.obtenerEventosProximos);
router.get("/:id", eventoController.obtenerEventoPorId);
router.post("/", eventoController.crearEvento);
router.put("/:id", eventoController.actualizarEvento);

module.exports = router;
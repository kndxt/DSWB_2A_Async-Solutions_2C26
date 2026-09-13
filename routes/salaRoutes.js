const express = require("express");
const router = express.Router();
const salaController = require("../controllers/salaController");

router.get("/", salaController.obtenerSalas);
router.get("/:id", salaController.obtenerSalaPorId);
router.post("/", salaController.crearSala);
router.put("/:id", salaController.actualizarSala);

module.exports = router;
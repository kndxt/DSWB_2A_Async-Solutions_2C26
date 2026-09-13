const Sala = require("../models/salaModel");

const obtenerSalas = (req, res) => {
  try {
    const salas = Sala.obtenerTodos();
    res.status(200).json(salas);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener las salas" });
  }
};

const obtenerSalaPorId = (req, res) => {
  try {
    const { id } = req.params;
    const sala = Sala.obtenerPorId(id);
    if (!sala) return res.status(404).json({ error: "Sala no encontrada" });
    res.status(200).json(sala);
  } catch (error) {
    res.status(500).json({ error: "Error al buscar la sala" });
  }
};

const crearSala = (req, res) => {
  try {
    const { nombre, capacidad, direccion, precioReserva, responsable } = req.body;

    if (!nombre || !capacidad || !direccion || precioReserva === undefined) {
      return res.status(400).json({
        error: "Nombre, capacidad, dirección y precio de reserva son obligatorios",
      });
    }

    if (typeof capacidad !== "number" || capacidad <= 0) {
      return res.status(400).json({ error: "La capacidad debe ser un número mayor a cero" });
    }

    if (typeof precioReserva !== "number" || precioReserva < 0) {
      return res.status(400).json({ error: "El precio de reserva debe ser un número mayor o igual a cero" });
    }

    const nuevaSala = Sala.crear({ nombre, capacidad, direccion, precioReserva, responsable });
    res.status(201).json(nuevaSala);
  } catch (error) {
    res.status(500).json({ error: "Error al crear la sala" });
  }
};

const actualizarSala = (req, res) => {
  try {
    const { id } = req.params;
    const salaExistente = Sala.obtenerPorId(id);
    if (!salaExistente) return res.status(404).json({ error: "Sala no encontrada" });

    if (req.body.capacidad !== undefined && (typeof req.body.capacidad !== "number" || req.body.capacidad <= 0)) {
      return res.status(400).json({ error: "La capacidad debe ser un número mayor a cero" });
    }

    if (req.body.precioReserva !== undefined && (typeof req.body.precioReserva !== "number" || req.body.precioReserva < 0)) {
      return res.status(400).json({ error: "El precio de reserva debe ser un número mayor o igual a cero" });
    }

    const salaActualizada = Sala.actualizar(id, req.body);
    res.status(200).json(salaActualizada);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar la sala" });
  }
};

module.exports = { obtenerSalas, obtenerSalaPorId, crearSala, actualizarSala };
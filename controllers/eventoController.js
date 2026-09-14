const { Evento, ESTADOS_VALIDOS } = require("../models/eventoModel");
const Sala = require("../models/salaModel");

const obtenerEventos = (req, res) => {
  try {
    const eventos = Evento.obtenerTodos();
    res.status(200).json(eventos);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los eventos" });
  }
};

const obtenerEventoPorId = (req, res) => {
  try {
    const { id } = req.params;
    const evento = Evento.obtenerPorId(id);
    if (!evento) return res.status(404).json({ error: "Evento no encontrado" });
    res.status(200).json(evento);
  } catch (error) {
    res.status(500).json({ error: "Error al buscar el evento" });
  }
};

const crearEvento = (req, res) => {
  try {
    const {
      nombre, descripcion, tipo,
      fechaInicio, fechaFin,
      fechaInicioVenta, fechaFinVenta,
      precioEntrada, salaId,
    } = req.body;

    if (!nombre || !tipo || !fechaInicio || !fechaFin || !fechaInicioVenta || !fechaFinVenta || !precioEntrada || !salaId) {
      return res.status(400).json({
        error: "Nombre, tipo, fechas de evento, fechas de venta, precio y salaId son obligatorios",
      });
    }

    if (typeof precioEntrada !== "number" || precioEntrada <= 0) {
      return res.status(400).json({ error: "El precio de entrada debe ser un número mayor a cero" });
    }

    const salaExiste = Sala.obtenerPorId(salaId);
    if (!salaExiste) {
      return res.status(400).json({ error: "La sala indicada no existe" });
    }

    if (new Date(fechaFin) < new Date(fechaInicio)) {
      return res.status(400).json({ error: "La fecha de fin no puede ser anterior a la fecha de inicio del evento" });
    }
    if (new Date(fechaFinVenta) < new Date(fechaInicioVenta)) {
      return res.status(400).json({ error: "La fecha de fin de venta no puede ser anterior a la de inicio de venta" });
    }
    if (new Date(fechaFinVenta) > new Date(fechaInicio)) {
      return res.status(400).json({ error: "La venta de entradas debe cerrar antes de que comience el evento" });
    }

    const nuevoEvento = Evento.crear({
      nombre, descripcion, tipo,
      fechaInicio, fechaFin,
      fechaInicioVenta, fechaFinVenta,
      precioEntrada, salaId,
    });
    res.status(201).json(nuevoEvento);
  } catch (error) {
    res.status(500).json({ error: "Error al crear el evento" });
  }
};

const actualizarEvento = (req, res) => {
  try {
    const { id } = req.params;
    const { salaId, estado } = req.body;

    const eventoExistente = Evento.obtenerPorId(id);
    if (!eventoExistente) return res.status(404).json({ error: "Evento no encontrado" });

    if (salaId) {
      const salaExiste = Sala.obtenerPorId(salaId);
      if (!salaExiste) return res.status(400).json({ error: "La sala indicada no existe" });
    }

    if (estado && !ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({ error: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(", ")}` });
    }

    const eventoActualizado = Evento.actualizar(id, req.body);
    res.status(200).json(eventoActualizado);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar el evento" });
  }
};

const obtenerEventosProximos = (req, res) => {
  try {
    const eventos = Evento.obtenerProximos();
    res.status(200).json(eventos);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los eventos próximos" });
  }
};

module.exports = { obtenerEventos, obtenerEventoPorId, crearEvento, actualizarEvento, obtenerEventosProximos };
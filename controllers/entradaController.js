const { Entrada, ESTADOS_ENTRADA } = require("../models/entradaModel");
const { Evento } = require("../models/eventoModel");
const Sala = require("../models/salaModel");
const Usuario = require("../models/usuarioModel");

const obtenerEntradas = (req, res) => {
  try {
    const entradas = Entrada.obtenerTodos();
    res.status(200).json(entradas);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener las entradas" });
  }
};

const obtenerEntradaPorId = (req, res) => {
  try {
    const { id } = req.params;
    const entrada = Entrada.obtenerPorId(id);

    if (!entrada) {
      return res.status(404).json({
        error: "Entrada no encontrada",
      });
    }

    res.status(200).json(entrada);
  } catch (error) {
    res.status(500).json({
      error: "Error al buscar la entrada",
    });
  }
};

const venderEntrada = (req, res) => {
  try {
    const { eventoId, usuarioId } = req.body;

    // Verifica que se hayan recibido los datos necesarios para la venta.
    if (!eventoId || !usuarioId) {
      return res.status(400).json({
        error: "Los ids del evento y el usuario son obligatorios",
      });
    }

    const evento = Evento.obtenerPorId(eventoId);

    // Una entrada solo puede venderse para un evento existente.
    if (!evento) {
      return res.status(404).json({
        error: "Evento no encontrado",
      });
    }

    // Verifica que el evento esté habilitado para nuevas ventas.
    if (!Evento.puedeVenderEntradas(evento)) {
      return res.status(400).json({
        error: "El evento no permite nuevas ventas",
      });
    }

    const usuario = Usuario.obtenerPorId(usuarioId);

    // Una entrada debe estar asociada a un cliente existente.
    if (!usuario) {
      return res.status(404).json({
        error: "Cliente no encontrado",
      });
    }

    const sala = Sala.obtenerPorId(evento.salaId);

    // El evento debe tener una sala válida para poder determinar su capacidad.
    if (!sala) {
      return res.status(404).json({
        error: "La sala asociada al evento no existe",
      });
    }

    const entradasDisponibles = Entrada.obtenerDisponiblesPorEvento(
      eventoId, 
      sala.capacidad
    );

    // Verifica que el evento tenga cupo disponible.
    if (entradasDisponibles <= 0) {
      return res.status(400).json({
        error: "El evento ya alcanzó su capacidad máxima",
      });
    }

    const nuevaEntrada = Entrada.crear({
      eventoId,
      usuarioId,
    });

    res.status(201).json(nuevaEntrada);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error al vender la entrada",
    });
  }
};

const cancelarEntrada = (req, res) => {
  try {
    const { id } = req.params;

    const entrada = Entrada.obtenerPorId(id);

    if (!entrada) {
      return res.status(404).json({
        error: "Entrada no encontrada",
      });
    }

    // Evita cancelar nuevamente una entrada que ya fue cancelada.
    if (entrada.estado === ESTADOS_ENTRADA.CANCELADA) {
      return res.status(400).json({
        error: "La entrada ya se encuentra cancelada",
      });
    }

    const entradaCancelada = Entrada.cancelar(id);

    res.status(200).json(entradaCancelada);
  } catch (error) {
    res.status(500).json({
      error: "Error al cancelar la entrada",
    });
  }
};

const obtenerVendidasPorEvento = (req, res) => {
  try {
    const { eventoId } = req.params;

    const evento = Evento.obtenerPorId(eventoId);
    if (!evento) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }

    const vendidas = Entrada.obtenerVendidasPorEvento(eventoId);
    res.status(200).json(vendidas);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener las entradas vendidas" });
  }
};

const obtenerDisponiblesPorEvento = (req, res) => {
  try {
    const { eventoId } = req.params;

    const evento = Evento.obtenerPorId(eventoId);
    if (!evento) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }

    const sala = Sala.obtenerPorId(evento.salaId);
    if (!sala) {
      return res.status(404).json({
        error: "La sala asociada al evento no existe",
      });
    }

    const disponibles = Entrada.obtenerDisponiblesPorEvento(
      eventoId,
      sala.capacidad
    );

    res.status(200).json({ eventoId: parseInt(eventoId), disponibles });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener las entradas disponibles" });
  }
};

module.exports = {
  obtenerEntradas,
  obtenerEntradaPorId,
  venderEntrada,
  cancelarEntrada,
  obtenerVendidasPorEvento,
  obtenerDisponiblesPorEvento,
};
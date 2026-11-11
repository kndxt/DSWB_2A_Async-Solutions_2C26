import {
  obtenerReservas as listarReservas,
  obtenerReservaPorEvento as buscarReservaPorEvento,
} from "../services/eventoService.js";

// Obtiene las reservas permitidas para el usuario autenticado.
const obtenerReservas = async (req, res) => {
  const reservas = await listarReservas(req.usuario, req.query.usuarioId);
  res.status(200).json(reservas);
};

// Obtiene la reserva asociada a un evento.
const obtenerReservaPorEvento = async (req, res) => {
  const reserva = await buscarReservaPorEvento(req.params.eventoId, req.usuario);
  res.status(200).json(reserva);
};

export { obtenerReservas, obtenerReservaPorEvento };

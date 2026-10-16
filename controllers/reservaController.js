import { Evento } from "../models/eventoModel.js";

// Proyección y populate comunes a las dos consultas.
const proyeccionEvento = "nombre fechaInicio estado reserva";
const populateUsuario = {
  path: "reserva.usuarioId",
  select: "nombre apellido email",
};

// Aplana la respuesta: datos de la reserva + contexto del evento.
const formatearReserva = (evento) => ({
  usuario: evento.reserva.usuarioId,
  fechaReserva: evento.reserva.fechaReserva,
  precioFinal: evento.reserva.precioFinal,
  evento: {
    id: evento.id,
    nombre: evento.nombre,
    fecha: evento.fechaInicio,
    estado: evento.estado,
  },
});

const obtenerReservas = async (req, res) => {
  const eventos = await Evento.find({ reserva: { $exists: true } })
    .select(proyeccionEvento)
    .populate(populateUsuario);

  const reservas = eventos.map(formatearReserva);

  res.status(200).json(reservas);
};

const obtenerReservaPorEvento = async (req, res) => {
  const { eventoId } = req.params;

  const evento = await Evento.findById(eventoId)
    .select(proyeccionEvento)
    .populate(populateUsuario);

  if (!evento || !evento.reserva) {
    return res.status(404).json({ error: "Reserva no encontrada" });
  }

  res.status(200).json(formatearReserva(evento));
};

export { obtenerReservas, obtenerReservaPorEvento };
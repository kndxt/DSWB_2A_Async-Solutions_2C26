import {
  obtenerTodas,
  obtenerPorId,
  obtenerProximos,
  crear,
  actualizar,
} from "../services/eventoService.js";

// Obtiene todos los eventos.
const obtenerEventos = async (req, res) => {
  const eventos = await obtenerTodas();

  res.status(200).json(eventos);
};

// Obtiene un evento por su identificador.
const obtenerEventoPorId = async (req, res) => {
  const evento = await obtenerPorId(req.params.id);

  res.status(200).json(evento);
};

// Crea un evento.
const crearEvento = async (req, res) => {
  const nuevoEvento = await crear(req.body);

  res.status(201).json(nuevoEvento);
};

// Actualiza un evento mediante PATCH.
const actualizarEvento = async (req, res) => {
  const eventoActualizado = await actualizar(req.params.id, req.body);

  res.status(200).json(eventoActualizado);
};

// Obtiene los eventos próximos.
const obtenerEventosProximos = async (req, res) => {
  const eventos = await obtenerProximos();

  res.status(200).json(eventos);
};

export {
  obtenerEventos,
  obtenerEventoPorId,
  crearEvento,
  actualizarEvento,
  obtenerEventosProximos,
};

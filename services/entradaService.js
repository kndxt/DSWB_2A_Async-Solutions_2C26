import { Entrada } from "../models/entradaModel.js";
import { Evento } from "../models/eventoModel.js";
import Sala from "../models/salaModel.js";
import Usuario, { ESTADOS_USUARIO } from "../models/usuarioModel.js";
import { NotFoundError, ConflictError } from "../errors/errores.js";

// Obtiene todas las entradas con sus detalles.
const obtenerTodas = () => Entrada.obtenerTodos({ detalles: true });

// Obtiene una entrada por su identificador.
const obtenerPorId = async (id) => {
  const entrada = await Entrada.obtenerPorId(id, { detalles: true });

  if (!entrada) {
    throw new NotFoundError("Entrada no encontrada");
  }

  return entrada;
};

// Vende una entrada si se cumplen las condiciones del caso de uso.
const vender = async ({ eventoId, usuarioId }) => {
  const evento = await Evento.obtenerPorId(eventoId);

  if (!evento) {
    throw new NotFoundError("Evento no encontrado");
  }

  if (!Evento.puedeVenderEntradas(evento)) {
    throw new ConflictError("El evento no permite nuevas ventas");
  }

  const usuario = await Usuario.obtenerPorId(usuarioId);

  if (!usuario) {
    throw new NotFoundError("Cliente no encontrado");
  }

  if (usuario.estado !== ESTADOS_USUARIO.ACTIVO) {
    throw new ConflictError("El cliente está inactivo");
  }

  const sala = await Sala.obtenerPorId(evento.salaId);

  if (!sala) {
    throw new NotFoundError("La sala asociada al evento no existe");
  }

  const entradasDisponibles = await Entrada.obtenerDisponiblesPorEvento(eventoId, sala.capacidad);

  if (entradasDisponibles <= 0) {
    throw new ConflictError("El evento ya alcanzó su capacidad máxima");
  }

  return Entrada.crear({ eventoId, usuarioId });
};

// Cancela una entrada vendida.
const cancelar = async (id) => {
  const entradaCancelada = await Entrada.cancelar(id, { detalles: true });

  if (!entradaCancelada) {
    throw new ConflictError("Entrada no encontrada o ya está cancelada");
  }

  return entradaCancelada;
};

// Obtiene las entradas vendidas de un evento existente.
const obtenerVendidasPorEvento = async (eventoId) => {
  const evento = await Evento.obtenerPorId(eventoId);

  if (!evento) {
    throw new NotFoundError("Evento no encontrado");
  }

  return Entrada.obtenerVendidasPorEvento(eventoId);
};

// Obtiene la disponibilidad de entradas de un evento.
const obtenerDisponiblesPorEvento = async (eventoId) => {
  const evento = await Evento.obtenerPorId(eventoId);

  if (!evento) {
    throw new NotFoundError("Evento no encontrado");
  }

  const sala = await Sala.obtenerPorId(evento.salaId);

  if (!sala) {
    throw new NotFoundError("La sala asociada al evento no existe");
  }

  const disponibles = await Entrada.obtenerDisponiblesPorEvento(eventoId, sala.capacidad);

  return {
    eventoId,
    nombre: evento.nombre,
    disponibles,
  };
};

export {
  obtenerTodas,
  obtenerPorId,
  vender,
  cancelar,
  obtenerVendidasPorEvento,
  obtenerDisponiblesPorEvento,
};

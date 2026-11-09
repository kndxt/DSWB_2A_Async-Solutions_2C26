import { Entrada } from "../models/entradaModel.js";
import { Evento } from "../models/eventoModel.js";
import Sala from "../models/salaModel.js";
import Usuario, { ESTADOS_USUARIO } from "../models/usuarioModel.js";
import {
  NotFoundError,
  ConflictError,
} from "../errors/errores.js";

const obtenerEntradas = async (req, res) => {
  const entradas = await Entrada.obtenerTodos({ detalles: true });
  res.status(200).json(entradas);
};

const obtenerEntradaPorId = async (req, res) => {
  const { id } = req.params;
  const entrada = await Entrada.obtenerPorId(id, { detalles: true });

  if (!entrada) {
    throw new NotFoundError("Entrada no encontrada");
  }

  res.status(200).json(entrada);

};

const venderEntrada = async (req, res) => {

  const { eventoId, usuarioId } = req.body;

  const evento = await Evento.obtenerPorId(eventoId);

  // Una entrada solo puede venderse para un evento existente.
  if (!evento) {
    throw new NotFoundError("Evento no encontrado");
  }

  // Verifica que el evento esté habilitado para nuevas ventas.
  if (!Evento.puedeVenderEntradas(evento)) {
    throw new ConflictError("El evento no permite nuevas ventas");
  }

  const usuario = await Usuario.obtenerPorId(usuarioId);

  // Una entrada debe estar asociada a un cliente existente.
  if (!usuario) {
    throw new NotFoundError("Cliente no encontrado");
  }

  // Un cliente inactivo no puede comprar entradas.
  if (usuario.estado !== ESTADOS_USUARIO.ACTIVO) {
    throw new ConflictError("El cliente está inactivo");
  }

  const sala = await Sala.obtenerPorId(evento.salaId);

  // El evento debe tener una sala válida para poder determinar su capacidad.
  if (!sala) {
    throw new NotFoundError("La sala asociada al evento no existe");
  }

  const entradasDisponibles = await Entrada.obtenerDisponiblesPorEvento(
    eventoId, 
    sala.capacidad
  );

  // Verifica que el evento tenga cupo disponible.
  if (entradasDisponibles <= 0) {
    throw new ConflictError("El evento ya alcanzó su capacidad máxima");
  }

  const nuevaEntrada = await Entrada.crear({
    eventoId,
    usuarioId,
  });

  res.status(201).json(nuevaEntrada);

};

const cancelarEntrada = async (req, res) => {
 
  const { id } = req.params;

  const entradaCancelada = await Entrada.cancelar(id, { detalles: true });

  if(!entradaCancelada) {
    throw new ConflictError(
      "Entrada no encontrada o ya está cancelada"
    );
  }

  res.status(200).json(entradaCancelada);

};

const obtenerVendidasPorEvento = async (req, res) => {

  const { eventoId } = req.params;

  const evento = await Evento.obtenerPorId(eventoId);

  if (!evento) {
    throw new NotFoundError("Evento no encontrado");
  }

  const vendidas = await Entrada.obtenerVendidasPorEvento(eventoId);
  
  res.status(200).json(vendidas);

};

const obtenerDisponiblesPorEvento = async (req, res) => {

  const { eventoId } = req.params;

  const evento = await Evento.obtenerPorId(eventoId);

  if (!evento) {
    throw new NotFoundError("Evento no encontrado");
  }

  const sala = await Sala.obtenerPorId(evento.salaId);

  if (!sala) {
    throw new NotFoundError(
      "La sala asociada al evento no existe"
    );
  }

  const disponibles = await Entrada.obtenerDisponiblesPorEvento(
    eventoId,
    sala.capacidad
  );

  res.status(200).json(
    { 
      eventoId: eventoId, 
      nombre: evento.nombre, 
      disponibles 
    }
  );

};

export {
  obtenerEntradas,
  obtenerEntradaPorId,
  venderEntrada,
  cancelarEntrada,
  obtenerVendidasPorEvento,
  obtenerDisponiblesPorEvento,
};
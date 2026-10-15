import { Entrada } from "../models/entradaModel.js";
import { Evento } from "../models/eventoModel.js";
import Sala from "../models/salaModel.js";
import Usuario from "../models/usuarioModel.js";

const obtenerEntradas = async (req, res) => {
  const entradas = await Entrada.obtenerTodos();
  res.status(200).json(entradas);
};

const obtenerEntradaPorId = async (req, res) => {
  const { id } = req.params;
  const entrada = await Entrada.obtenerPorId(id);

  if (!entrada) {
    return res.status(404).json({
      error: "Entrada no encontrada",
    });
  }

  res.status(200).json(entrada);

};

const venderEntrada = async (req, res) => {

  const { eventoId, usuarioId } = req.body;

  const evento = await Evento.obtenerPorId(eventoId);

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

  const usuario = await Usuario.obtenerPorId(usuarioId);

  // Una entrada debe estar asociada a un cliente existente.
  if (!usuario) {
    return res.status(404).json({
      error: "Cliente no encontrado",
    });
  }

  const sala = await Sala.obtenerPorId(evento.salaId);

  // El evento debe tener una sala válida para poder determinar su capacidad.
  if (!sala) {
    return res.status(404).json({
      error: "La sala asociada al evento no existe",
    });
  }

  const entradasDisponibles = await Entrada.obtenerDisponiblesPorEvento(
    eventoId, 
    sala.capacidad
  );

  // Verifica que el evento tenga cupo disponible.
  if (entradasDisponibles <= 0) {
    return res.status(400).json({
      error: "El evento ya alcanzó su capacidad máxima",
    });
  }

  const nuevaEntrada = await Entrada.crear({
    eventoId,
    usuarioId,
  });

  res.status(201).json(nuevaEntrada);

};

const cancelarEntrada = async (req, res) => {
 
  const { id } = req.params;

  const entradaCancelada = await Entrada.cancelar(id);

  if(!entradaCancelada) {
    return res.status(400).json({
      error: "Entrada no encontrada o ya está cancelada",
    });
  }

  res.status(200).json(entradaCancelada);

};

const obtenerVendidasPorEvento = async (req, res) => {

  const { eventoId } = req.params;

  const evento = await Evento.obtenerPorId(eventoId);

  if (!evento) {
    return res.status(404).json({ error: "Evento no encontrado" });
  }

  const vendidas = await Entrada.obtenerVendidasPorEvento(eventoId);
  
  res.status(200).json(vendidas);

};

const obtenerDisponiblesPorEvento = async (req, res) => {

  const { eventoId } = req.params;

  const evento = await Evento.obtenerPorId(eventoId);

  if (!evento) {
    return res.status(404).json({ error: "Evento no encontrado" });
  }

  const sala = await Sala.obtenerPorId(evento.salaId);

  if (!sala) {
    return res.status(404).json({
      error: "La sala asociada al evento no existe",
    });
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
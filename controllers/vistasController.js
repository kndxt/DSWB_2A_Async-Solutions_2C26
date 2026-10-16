import { Evento } from "../models/eventoModel.js";
import { Entrada } from "../models/entradaModel.js";
import Sala from "../models/salaModel.js";

const renderizarSalas = (req, res) => res.render("salas");

const renderizarEventos = (req, res) => res.render("eventos");

const renderizarEntradasPorEvento = async (req, res) => {
  const { eventoId } = req.params;

  const evento = await Evento.obtenerPorId(eventoId);
  if (!evento) {
    return res.status(404).send("Evento no encontrado");
  }

  const sala = await Sala.obtenerPorId(evento.salaId);
  if (!sala) {
    return res.status(404).send("La sala asociada al evento no existe");
  }

  const vendidas = await Entrada.obtenerVendidasPorEvento(eventoId);
  const disponibles = await Entrada.obtenerDisponiblesPorEvento(
    eventoId,
    sala.capacidad
  );

  res.render("entradas", {
    eventoId,
    evento,
    sala,
    vendidas,
    disponibles,
  });

};


const renderizarEntradas = (req, res) => {
  res.render("entradas/index");
};

const renderizarReservas = (req, res) => res.render("reservas");

export { 
  renderizarSalas,
  renderizarEventos, 
  renderizarEntradasPorEvento,
  renderizarEntradas,
  renderizarReservas,
};
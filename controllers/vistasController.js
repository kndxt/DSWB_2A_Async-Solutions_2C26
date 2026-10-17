import { Evento } from "../models/eventoModel.js";
import { Entrada } from "../models/entradaModel.js";
import Sala from "../models/salaModel.js";

const renderizarUsuarios = (req, res) => res.render("usuarios");

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
    sala.capacidad,
  );

  res.render("entradas", {
    eventoId,
    evento,
    sala,
    vendidas,
    disponibles,
  });
};

const renderizarFetchPrueba = (req, res) => {
  res.render("fetchPrueba");
};

const renderizarReservas = (req, res) => res.render("reservas");

const renderizarLogin = (req, res) => res.render("login");

const renderizarInicio = (req, res) => res.render("inicio");

export {
  renderizarUsuarios,
  renderizarSalas,
  renderizarEventos,
  renderizarEntradasPorEvento,
  renderizarFetchPrueba,
  renderizarReservas,
  renderizarLogin,
  renderizarInicio,
};

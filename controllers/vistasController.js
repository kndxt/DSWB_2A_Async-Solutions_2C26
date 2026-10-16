import { Evento } from "../models/eventoModel.js";
import { Entrada } from "../models/entradaModel.js";
import Sala from "../models/salaModel.js";

const renderizarEventosProximos = (req, res) => {
  try {
    const eventos = Evento.obtenerProximos();
    res.render("eventos", { eventos });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error al renderizar los eventos próximos");
  }
};

const renderizarEntradasPorEvento = (req, res) => {
  try {
    const { eventoId } = req.params;

    const evento = Evento.obtenerPorId(eventoId);
    if (!evento) {
      return res.status(404).send("Evento no encontrado");
    }

    const sala = Sala.obtenerPorId(evento.salaId);
    if (!sala) {
      return res.status(404).send("La sala asociada al evento no existe");
    }

    const vendidas = Entrada.obtenerVendidasPorEvento(eventoId);
    const disponibles = Entrada.obtenerDisponiblesPorEvento(
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
  } catch (error) {
    console.error(error);
    res.status(500).send("Error al renderizar las entradas del evento");
  }
};

const renderizarFetchPrueba = (req, res) => {
  res.render("fetchPrueba");
};

export { 
  renderizarEventosProximos, 
  renderizarEntradasPorEvento,
  renderizarFetchPrueba,
};
import { Entrada } from "../models/entradaModel.js";
import {
  obtenerEntradaPorId as obtenerEntradaPorIdService,
  venderEntrada as venderEntradaService,
  cancelarEntrada as cancelarEntradaService,
  obtenerVendidasPorEvento as obtenerVendidasPorEventoService,
  obtenerDisponiblesPorEvento as obtenerDisponiblesPorEventoService,
} from "../services/entradaService.js";

const obtenerEntradas = async (req, res) => {
  const entradas = await Entrada.obtenerTodos({ detalles: true });
  res.status(200).json(entradas);
};

const obtenerEntradaPorId = async (req, res) => {

  const entrada = await obtenerEntradaPorIdService(req.params.id);
  res.status(200).json(entrada);

};

const venderEntrada = async (req, res) => {

  const nuevaEntrada = await venderEntradaService(req.body);
  res.status(201).json(nuevaEntrada);

};

const cancelarEntrada = async (req, res) => {
 
  const entradaCancelada = await cancelarEntradaService(req.params.id);
  res.status(200).json(entradaCancelada);

};

const obtenerVendidasPorEvento = async (req, res) => {

  const vendidas = await obtenerVendidasPorEventoService(req.params.eventoId);
  res.status(200).json(vendidas);

};

const obtenerDisponiblesPorEvento = async (req, res) => {

  const resultado = await obtenerDisponiblesPorEventoService(req.params.eventoId);

  res.status(200).json(resultado);

};

export {
  obtenerEntradas,
  obtenerEntradaPorId,
  venderEntrada,
  cancelarEntrada,
  obtenerVendidasPorEvento,
  obtenerDisponiblesPorEvento,
};
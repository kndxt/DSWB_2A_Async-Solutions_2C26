import {
  obtenerTodas as obtenerSalasService,
  obtenerPorId as obtenerSalaPorIdService,
  crear as crearSalaService,
  actualizar as actualizarSalaService,
} from "../services/salaService.js";

const obtenerSalas = async (req, res) => {
  const salas = await obtenerSalasService();
  res.status(200).json(salas);
};

const obtenerSalaPorId = async (req, res) => {
  const sala = await obtenerSalaPorIdService(req.params.id);
  res.status(200).json(sala);
};

const crearSala = async (req, res) => {
  const nuevaSala = await crearSalaService(req.body);
  res.status(201).json(nuevaSala);
};

const actualizarSala = async (req, res) => {
  const salaActualizada = await actualizarSalaService(req.params.id, req.body);
  res.status(200).json(salaActualizada);
};

export { obtenerSalas, obtenerSalaPorId, crearSala, actualizarSala };

import { obtenerResumenPorEvento } from "../services/entradaService.js";

const renderizarUsuarios = (req, res) => res.render("usuarios");

const renderizarSalas = (req, res) => res.render("salas");

const renderizarEventos = (req, res) => res.render("eventos");

const renderizarEntradasPorEvento = async (req, res) => {
  const { eventoId } = req.params;

  const resumen = await obtenerResumenPorEvento(eventoId);

  res.render("entradas", {
    eventoId,
    ...resumen,
  });
};

const renderizarEntradas = (req, res) => {
  res.render("entradas/index");
};

const renderizarReservas = (req, res) => res.render("reservas");

const renderizarLogin = (req, res) => res.render("login");

const renderizarInicio = (req, res) => res.render("inicio");

export {
  renderizarUsuarios,
  renderizarSalas,
  renderizarEventos,
  renderizarEntradasPorEvento,
  renderizarEntradas,
  renderizarReservas,
  renderizarLogin,
  renderizarInicio,
};

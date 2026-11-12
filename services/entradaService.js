import { Entrada } from "../models/entradaModel.js";
import { obtenerPorId as obtenerEventoPorId, puedeVenderEntradas } from "./eventoService.js";
import { obtenerPorId as obtenerSalaPorId } from "./salaService.js";
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
  const evento = await obtenerEventoPorId(eventoId);

  if (!puedeVenderEntradas(evento)) {
    throw new ConflictError("El evento no permite nuevas ventas");
  }

  const sala = await obtenerSalaPorId(evento.salaId);

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
  const evento = await obtenerEventoPorId(eventoId);

  return Entrada.obtenerVendidasPorEvento(eventoId);
};

// Obtiene la disponibilidad de entradas de un evento.
const obtenerDisponiblesPorEvento = async (eventoId) => {
  const evento = await obtenerEventoPorId(eventoId);

  const sala = await obtenerSalaPorId(evento.salaId);

  const disponibles = await Entrada.obtenerDisponiblesPorEvento(eventoId, sala.capacidad);

  return {
    eventoId,
    nombre: evento.nombre,
    disponibles,
  };
};

// Obtiene los datos necesarios para mostrar el resumen de las entradas de un evento.
const obtenerResumenPorEvento = async (eventoId) => {
  const evento = await obtenerEventoPorId(eventoId);
  const sala = await obtenerSalaPorId(evento.salaId);

  const [vendidas, disponibles] = await Promise.all([
    Entrada.obtenerVendidasPorEvento(eventoId),
    Entrada.obtenerDisponiblesPorEvento(eventoId, sala.capacidad),
  ]);

  return {
    evento,
    sala,
    vendidas,
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
  obtenerResumenPorEvento,
};

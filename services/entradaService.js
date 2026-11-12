import { Entrada } from "../models/entradaModel.js";
import { obtenerPorId as obtenerEventoPorId, puedeVenderEntradas } from "./eventoService.js";
import { obtenerPorId as obtenerSalaPorId } from "./salaService.js";
import { ROLES_USUARIO } from "../models/usuarioModel.js";
import { NotFoundError, ConflictError, ForbiddenError } from "../errors/errores.js";

// Obtiene las entradas según el rol del usuario autenticado.
// Los administradores pueden consultar todas o filtrar por titular.
// Los clientes solo pueden consultar sus propias entradas,
// independientemente del usuarioId enviado en la consulta.
const obtenerTodas = async (usuario, usuarioIdSolicitado) => {
  let usuarioId;

  if (usuario.rol === ROLES_USUARIO.ADMIN) {
    usuarioId = usuarioIdSolicitado;
  } else if (usuario.rol === ROLES_USUARIO.CLIENTE) {
    // La identidad del cliente se obtiene de la sesión, no del query.
    usuarioId = usuario.id ?? usuario._id;
  } else {
    throw new ForbiddenError("No tenés permiso para consultar entradas");
  }

  return Entrada.obtenerTodos({ detalles: true, usuarioId });
};

// Obtiene una entrada por su identificador.
// Los clientes solo pueden consultar entradas propias.
const obtenerPorId = async (id, usuario) => {
  const entrada = await Entrada.obtenerPorId(id, { detalles: true });

  if (!entrada) {
    throw new NotFoundError("Entrada no encontrada");
  }

  verificarTitularidad(entrada, usuario);

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
const cancelar = async (id, usuario) => {
  const entrada = await Entrada.obtenerPorId(id);

  if (!entrada) {
    throw new NotFoundError("Entrada no encontrada");
  }

  verificarTitularidad(entrada, usuario);

  const entradaCancelada = await Entrada.cancelar(id, { detalles: true });

  if (!entradaCancelada) {
    throw new ConflictError("La entrada ya está cancelada");
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

// Comprueba si el usuario autenticado puede acceder a una entrada.
// Los administradores pueden acceder a cualquier entrada.
// Los clientes solo pueden acceder a las propias.
const verificarTitularidad = (entrada, usuario) => {
  if (usuario.rol === ROLES_USUARIO.ADMIN) {
    return;
  }

  const titularId = entrada.usuarioId?._id ?? entrada.usuarioId;
  const usuarioId = usuario.id ?? usuario._id;

  if (titularId.toString() !== usuarioId.toString()) {
    throw new NotFoundError("Entrada no encontrada");
  }
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

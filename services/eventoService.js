import { Evento, ESTADOS_EVENTO } from "../models/eventoModel.js";
import { ESTADOS_SALA } from "../models/salaModel.js";
import { obtenerPorId as obtenerSalaPorId } from "./salaService.js";
import Usuario, { ESTADOS_USUARIO } from "../models/usuarioModel.js";
import { ValidationError, NotFoundError, ConflictError } from "../errors/errores.js";

const MENSAJE_DUPLICADO = "Ya existe un evento con el mismo nombre, sala y fecha de inicio";

const MENSAJE_SOLAPAMIENTO = "El evento se superpone con otro evento de la misma sala";

// Campos que el cliente puede modificar.
// La reserva histórica no forma parte de los campos editables.
const CAMPOS_EDITABLES = [
  "nombre",
  "descripcion",
  "tipo",
  "fechaInicio",
  "fechaFin",
  "fechaInicioVenta",
  "fechaFinVenta",
  "precioEntrada",
  "estado",
  "salaId",
];

// Filtra los campos que pueden modificarse mediante PATCH.
const filtrarCambios = (datos) =>
  Object.fromEntries(Object.entries(datos).filter(([campo]) => CAMPOS_EDITABLES.includes(campo)));

// Comprueba las relaciones entre las fechas del evento.
const validarFechas = ({ fechaInicio, fechaFin, fechaInicioVenta, fechaFinVenta }) => {
  if (new Date(fechaFin) < new Date(fechaInicio)) {
    throw new ValidationError(
      "La fecha de fin no puede ser anterior a la fecha de inicio del evento",
    );
  }

  if (new Date(fechaFinVenta) < new Date(fechaInicioVenta)) {
    throw new ValidationError(
      "La fecha de fin de venta no puede ser anterior a la de inicio de venta",
    );
  }

  if (new Date(fechaFinVenta) > new Date(fechaInicio)) {
    throw new ValidationError("La venta de entradas debe cerrar antes de que comience el evento");
  }
};

// Obtiene todos los eventos.
const obtenerTodas = () => Evento.obtenerTodos();

// Obtiene un evento por su identificador.
const obtenerPorId = async (id) => {
  const evento = await Evento.obtenerPorId(id);

  if (!evento) {
    throw new NotFoundError("Evento no encontrado");
  }

  return evento;
};

// Obtiene los eventos próximos.
const obtenerProximos = () => Evento.obtenerProximos();

// Crea un evento y genera su reserva inicial.
const crear = async ({ usuarioId, ...datosEvento }) => {
  const sala = await obtenerSalaPorId(datosEvento.salaId);

  if (sala.estado !== ESTADOS_SALA.ACTIVA) {
    throw new ConflictError("No se puede crear un evento en una sala inactiva");
  }

  const usuario = await Usuario.obtenerPorId(usuarioId);

  if (!usuario) {
    throw new NotFoundError("El usuario indicado no existe");
  }

  if (usuario.estado !== ESTADOS_USUARIO.ACTIVO) {
    throw new ConflictError("El usuario indicado está inactivo");
  }

  validarFechas(datosEvento);

  const existeDuplicado = await Evento.existeDuplicado({
    nombre: datosEvento.nombre,
    salaId: datosEvento.salaId,
    fechaInicio: datosEvento.fechaInicio,
  });

  if (existeDuplicado) {
    throw new ConflictError(MENSAJE_DUPLICADO);
  }

  const existeSolapamiento = await Evento.existeSolapamiento({
    salaId: datosEvento.salaId,
    fechaInicio: datosEvento.fechaInicio,
    fechaFin: datosEvento.fechaFin,
  });

  if (existeSolapamiento) {
    throw new ConflictError(MENSAJE_SOLAPAMIENTO);
  }

  // La reserva se genera en el servidor.
  // No se utiliza una reserva enviada por el cliente.
  const reserva = {
    usuarioId: usuario._id,
    fechaReserva: new Date(),
    precioFinal: sala.precioReserva,
  };

  return Evento.crear({
    ...datosEvento,
    reserva,
  });
};

// Actualiza un evento mediante PATCH.
const actualizar = async (id, datos) => {
  const evento = await Evento.obtenerPorId(id);

  if (!evento) {
    throw new NotFoundError("Evento no encontrado");
  }

  // No se permite modificar eventos cuya sala actual está inactiva.
  const salaActual = await obtenerSalaPorId(evento.salaId);

  if (salaActual.estado === ESTADOS_SALA.INACTIVA) {
    throw new ConflictError("No se puede modificar un evento de una sala inactiva");
  }

  const cambios = filtrarCambios(datos);

  // Si se cambia la sala, debe existir y estar activa.
  if (cambios.salaId !== undefined) {
    const nuevaSala = await obtenerSalaPorId(cambios.salaId);

    if (nuevaSala.estado !== ESTADOS_SALA.ACTIVA) {
      throw new ConflictError("No se puede asignar un evento a una sala inactiva");
    }
  }

  // Combinamos el estado actual con los cambios para validar
  // el evento completo, aunque el PATCH solo modifique algunos campos.
  const eventoActualizado = {
    ...evento.toObject(),
    ...cambios,
  };

  validarFechas(eventoActualizado);

  const cambioDatosDuplicables =
    cambios.nombre !== undefined ||
    cambios.salaId !== undefined ||
    cambios.fechaInicio !== undefined;

  if (cambioDatosDuplicables) {
    const existeDuplicado = await Evento.existeDuplicado({
      nombre: eventoActualizado.nombre,
      salaId: eventoActualizado.salaId,
      fechaInicio: eventoActualizado.fechaInicio,
      excluirId: evento._id,
    });

    if (existeDuplicado) {
      throw new ConflictError(MENSAJE_DUPLICADO);
    }
  }

  const cambioFechasOSala =
    cambios.fechaInicio !== undefined ||
    cambios.fechaFin !== undefined ||
    cambios.salaId !== undefined;

  if (cambioFechasOSala) {
    const existeSolapamiento = await Evento.existeSolapamiento({
      salaId: eventoActualizado.salaId,
      fechaInicio: eventoActualizado.fechaInicio,
      fechaFin: eventoActualizado.fechaFin,
      excluirId: evento._id,
    });

    if (existeSolapamiento) {
      throw new ConflictError(MENSAJE_SOLAPAMIENTO);
    }
  }

  return Evento.actualizar(evento, cambios);
};

// Comprueba si un evento admite nuevas ventas.
const puedeVenderEntradas = (evento) => {
  if (evento.estado !== ESTADOS_EVENTO.ACTIVO) {
    return false;
  }

  const hoy = new Date();
  const inicioVenta = new Date(evento.fechaInicioVenta);
  const finVenta = new Date(evento.fechaFinVenta);

  return hoy >= inicioVenta && hoy <= finVenta;
};

export { obtenerTodas, obtenerPorId, obtenerProximos, crear, actualizar, puedeVenderEntradas };

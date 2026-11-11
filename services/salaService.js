import Sala, { ESTADOS_SALA } from "../models/salaModel.js";
import { Evento } from "../models/eventoModel.js";
import { NotFoundError, ConflictError } from "../errors/errores.js";

// Obtiene todas las salas.
const obtenerTodas = () => Sala.obtenerTodos();

// Obtiene una sala por su identificador.
const obtenerPorId = async (id) => {
  const sala = await Sala.obtenerPorId(id);
  if (!sala) throw new NotFoundError("Sala no encontrada");
  return sala;
};

// Crea una sala con los datos recibidos.
const crear = (datos) => Sala.crear(datos);

// Actualiza una sala si se cumplen las condiciones del caso de uso.
const actualizar = async (id, cambios) => {
  const sala = await Sala.obtenerPorId(id);
  if (!sala) throw new NotFoundError("Sala no encontrada");

  // Impide inactivar una sala que tiene eventos próximos activos.
  if (cambios.estado === ESTADOS_SALA.INACTIVA && sala.estado === ESTADOS_SALA.ACTIVA) {
    const hayEventosProximos = await Evento.existeProximoActivoPorSala(sala._id);

    if (hayEventosProximos) {
      throw new ConflictError(
        "No se puede dar de baja una sala que tiene eventos próximos activos",
      );
    }
  }

  return Sala.actualizar(sala, cambios);
};

export { obtenerTodas, obtenerPorId, crear, actualizar };

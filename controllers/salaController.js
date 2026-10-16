import Sala, { ESTADOS_SALA } from "../models/salaModel.js";
import Evento from "../models/eventoModel.js";

const ESTADOS_VALIDOS = Object.values(ESTADOS_SALA);
const CAMPOS_EDITABLES = ["nombre", "capacidad", "direccion", "precioReserva", "responsable", "estado"];

// Los ids ahora son ObjectId de MongoDB (24 caracteres hexadecimales).
const idValido = (id) => /^[0-9a-fA-F]{24}$/.test(id);

const responsableCompleto = (responsable) =>
  Boolean(
    responsable &&
      responsable.nombre &&
      responsable.apellido &&
      responsable.telefono &&
      responsable.email,
  );

// Une los mensajes de las validaciones del esquema en un solo texto.
const mensajeValidacion = (error) =>
  Object.values(error.errors)
    .map((e) => e.message)
    .join(". ");

// Los errores inesperados (500) se relanzan: asyncHandler los deriva a errorHandler.
const manejarError = (error, res) => {
  if (error.name === "ValidationError") {
    return res.status(400).json({ error: mensajeValidacion(error) });
  }
  throw error;
};

const obtenerSalas = async (req, res) => {
  const salas = await Sala.find().sort({ _id: 1 });
  res.status(200).json(salas);
};

const obtenerSalaPorId = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) return res.status(400).json({ error: "El ID de la sala no es válido" });

  const sala = await Sala.findById(id);
  if (!sala) return res.status(404).json({ error: "Sala no encontrada" });
  res.status(200).json(sala);
};

const crearSala = async (req, res) => {
  const { nombre, capacidad, direccion, precioReserva, responsable } = req.body;

  if (!nombre || !capacidad || !direccion || precioReserva === undefined || !responsable) {
    return res.status(400).json({
      error: "Nombre, capacidad, dirección, precio de reserva y responsable son obligatorios",
    });
  }

  if (typeof capacidad !== "number" || capacidad <= 0) {
    return res.status(400).json({ error: "La capacidad debe ser un número mayor a cero" });
  }

  if (typeof precioReserva !== "number" || precioReserva < 0) {
    return res.status(400).json({ error: "El precio de reserva debe ser un número mayor o igual a cero" });
  }

  if (!responsableCompleto(responsable)) {
    return res.status(400).json({
      error: "El responsable debe incluir nombre, apellido, teléfono y email",
    });
  }

  try {
    const nuevaSala = await Sala.create({ nombre, capacidad, direccion, precioReserva, responsable });
    res.status(201).json(nuevaSala);
  } catch (error) {
    manejarError(error, res);
  }
};

const actualizarSala = async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) return res.status(400).json({ error: "El ID de la sala no es válido" });

  const sala = await Sala.findById(id);
  if (!sala) return res.status(404).json({ error: "Sala no encontrada" });

  if (req.body.capacidad !== undefined && (typeof req.body.capacidad !== "number" || req.body.capacidad <= 0)) {
    return res.status(400).json({ error: "La capacidad debe ser un número mayor a cero" });
  }

  if (req.body.precioReserva !== undefined && (typeof req.body.precioReserva !== "number" || req.body.precioReserva < 0)) {
    return res.status(400).json({ error: "El precio de reserva debe ser un número mayor o igual a cero" });
  }

  // El responsable se reemplaza completo, así que si viene debe estar completo.
  if (req.body.responsable !== undefined && !responsableCompleto(req.body.responsable)) {
    return res.status(400).json({
      error: "El responsable debe incluir nombre, apellido, teléfono y email",
    });
  }

  // Validar si el estado enviado es válido
  if (req.body.estado !== undefined && !ESTADOS_VALIDOS.includes(req.body.estado)) {
    return res.status(400).json({ error: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(", ")}` });
  }

  // REGLA DE NEGOCIO: Bloquear la baja si la sala pasa de 'activa' a 'inactiva' y tiene eventos próximos activos
  if (
    req.body.estado === ESTADOS_SALA.INACTIVA &&
    sala.estado === ESTADOS_SALA.ACTIVA
  ) {
    const hayEventosProximos = await Evento.exists({
      salaId: sala._id,
      estado: "activo",
      fechaInicio: { $gte: new Date() },
    });

    if (hayEventosProximos) {
      return res.status(400).json({
        error: "No se puede dar de baja una sala que tiene eventos próximos activos",
      });
    }
  }

  // Solo se aplican los campos editables
  const cambios = Object.fromEntries(
    CAMPOS_EDITABLES.filter((campo) => req.body[campo] !== undefined).map((campo) => [campo, req.body[campo]]),
  );

  try {
    sala.set(cambios);
    await sala.save();
    res.status(200).json(sala);
  } catch (error) {
    manejarError(error, res);
  }
};

export { obtenerSalas, obtenerSalaPorId, crearSala, actualizarSala };
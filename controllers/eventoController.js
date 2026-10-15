import { Evento, ESTADOS_VALIDOS } from "../models/eventoModel.js";
import Sala from "../models/salaModel.js";
import Usuario from "../models/usuarioModel.js";

const MENSAJE_DUPLICADO = "Ya existe un evento con el mismo nombre, sala y fecha de inicio";

const CAMPOS_FECHA = ["fechaInicio", "fechaFin", "fechaInicioVenta", "fechaFinVenta"];

// La reserva es un registro histórico: no se edita desde el PUT, igual que _id e id.
const CAMPOS_EDITABLES = [
  "nombre", "descripcion", "tipo",
  ...CAMPOS_FECHA,
  "precioEntrada", "estado", "salaId",
];

// Los ids de la URL y los del POST los valida el middleware validarIds en las rutas.
// Este chequeo solo cubre el salaId opcional del PUT, que el middleware no valida.
const idValido = (id) => typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);

const fechaValida = (valor) => !Number.isNaN(new Date(valor).getTime());

const precioValido = (precio) => typeof precio === "number" && precio > 0;

const buscarSala = (id) => (idValido(id) ? Sala.findById(id) : null);

// Devuelve el mensaje de la primera regla de fechas que se incumple, o null si son coherentes.
const mensajeFechasIncoherentes = ({ fechaInicio, fechaFin, fechaInicioVenta, fechaFinVenta }) => {
  if (new Date(fechaFin) < new Date(fechaInicio)) {
    return "La fecha de fin no puede ser anterior a la fecha de inicio del evento";
  }
  if (new Date(fechaFinVenta) < new Date(fechaInicioVenta)) {
    return "La fecha de fin de venta no puede ser anterior a la de inicio de venta";
  }
  if (new Date(fechaFinVenta) > new Date(fechaInicio)) {
    return "La venta de entradas debe cerrar antes de que comience el evento";
  }
  return null;
};

// Une los mensajes de las validaciones del esquema en un solo texto.
const mensajeValidacion = (error) =>
  Object.values(error.errors)
    .map((e) => e.message)
    .join(". ");

// Los errores inesperados (500) se relanzan: asyncHandler los deriva a errorHandler.
// Los controladores solo responden aquí los errores propios de reglas de negocio.
const manejarError = (error, res) => {
  if (error.name === "ValidationError") {
    return res.status(400).json({ error: mensajeValidacion(error) });
  }
  // Respaldo del índice único ante dos solicitudes simultáneas.
  if (error.code === 11000) {
    return res.status(400).json({ error: MENSAJE_DUPLICADO });
  }
  throw error;
};

const obtenerEventos = async (req, res) => {
  const eventos = await Evento.obtenerTodos();
  res.status(200).json(eventos);
};

const obtenerEventoPorId = async (req, res) => {
  const evento = await Evento.obtenerPorId(req.params.id);
  if (!evento) return res.status(404).json({ error: "Evento no encontrado" });
  res.status(200).json(evento);
};

const crearEvento = async (req, res) => {
  // salaId y usuarioId llegan ya validados (obligatorios y con formato de ObjectId) por validarIds.
  const {
    nombre, descripcion, tipo,
    fechaInicio, fechaFin,
    fechaInicioVenta, fechaFinVenta,
    precioEntrada, salaId, usuarioId,
  } = req.body;

  if (!nombre || !tipo || !fechaInicio || !fechaFin || !fechaInicioVenta || !fechaFinVenta || !precioEntrada) {
    return res.status(400).json({
      error: "Nombre, tipo, fechas de evento, fechas de venta y precio son obligatorios",
    });
  }

  if (!precioValido(precioEntrada)) {
    return res.status(400).json({ error: "El precio de entrada debe ser un número mayor a cero" });
  }

  // se convierte las fechas, así que un texto inválido se rechaza acá con un mensaje claro.
  if (![fechaInicio, fechaFin, fechaInicioVenta, fechaFinVenta].every(fechaValida)) {
    return res.status(400).json({ error: "Las fechas indicadas no tienen un formato válido" });
  }

  const errorFechas = mensajeFechasIncoherentes({ fechaInicio, fechaFin, fechaInicioVenta, fechaFinVenta });
  if (errorFechas) return res.status(400).json({ error: errorFechas });

  const sala = await Sala.findById(salaId);
  if (!sala) return res.status(400).json({ error: "La sala indicada no existe" });

  const usuario = await Usuario.findById(usuarioId);
  if (!usuario) return res.status(400).json({ error: "El usuario indicado no existe" });
  if (usuario.estado !== "activo") {
    return res.status(400).json({ error: "El usuario indicado está inactivo" });
  }

  if (await Evento.existeDuplicado({ nombre, salaId, fechaInicio })) {
    return res.status(400).json({ error: MENSAJE_DUPLICADO });
  }

  try {
    const nuevoEvento = await Evento.crear({
      nombre, descripcion, tipo,
      fechaInicio, fechaFin,
      fechaInicioVenta, fechaFinVenta,
      precioEntrada, salaId,
      // Registro histórico: el precio de la sala se copia al momento de crear el evento.
      reserva: { usuarioId, fechaReserva: new Date(), precioFinal: sala.precioReserva },
    });
    res.status(201).json(nuevoEvento);
  } catch (error) {
    manejarError(error, res);
  }
};

const actualizarEvento = async (req, res) => {
  const { id } = req.params;

  const evento = await Evento.obtenerPorId(id);
  if (!evento) return res.status(404).json({ error: "Evento no encontrado" });

  // Solo se aplican los campos editables (ignora _id, id, reserva y operadores como $set).
  const cambios = Object.fromEntries(
    CAMPOS_EDITABLES.filter((campo) => req.body[campo] !== undefined).map((campo) => [campo, req.body[campo]]),
  );

  if (cambios.salaId !== undefined && !(await buscarSala(cambios.salaId))) {
    return res.status(400).json({ error: "La sala indicada no existe" });
  }

  if (cambios.estado !== undefined && !ESTADOS_VALIDOS.includes(cambios.estado)) {
    return res.status(400).json({ error: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(", ")}` });
  }

  if (cambios.precioEntrada !== undefined && !precioValido(cambios.precioEntrada)) {
    return res.status(400).json({ error: "El precio de entrada debe ser un número mayor a cero" });
  }

  if (CAMPOS_FECHA.some((campo) => cambios[campo] !== undefined && !fechaValida(cambios[campo]))) {
    return res.status(400).json({ error: "Las fechas indicadas no tienen un formato válido" });
  }

  // Las reglas de fechas se comprueban sobre el resultado final (valores actuales + cambios).
  const resultado = { ...evento.toObject(), ...cambios };
  const errorFechas = mensajeFechasIncoherentes(resultado);
  if (errorFechas) return res.status(400).json({ error: errorFechas });

  if (["nombre", "salaId", "fechaInicio"].some((campo) => cambios[campo] !== undefined)) {
    const duplicado = await Evento.existeDuplicado({
      nombre: resultado.nombre,
      salaId: resultado.salaId,
      fechaInicio: resultado.fechaInicio,
      excluirId: id,
    });
    if (duplicado) return res.status(400).json({ error: MENSAJE_DUPLICADO });
  }

  try {
    const eventoActualizado = await Evento.actualizar(id, cambios);
    if (!eventoActualizado) return res.status(404).json({ error: "Evento no encontrado" });
    res.status(200).json(eventoActualizado);
  } catch (error) {
    manejarError(error, res);
  }
};

const obtenerEventosProximos = async (req, res) => {
  const eventos = await Evento.obtenerProximos();
  res.status(200).json(eventos);
};

export { obtenerEventos, obtenerEventoPorId, crearEvento, actualizarEvento, obtenerEventosProximos };
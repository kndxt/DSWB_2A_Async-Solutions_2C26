import Usuario, { ESTADOS_VALIDOS } from "../models/usuarioModel.js";

// Campos que se pueden modificar con PUT. El estado tiene su propio endpoint.
const CAMPOS_EDITABLES = ["nombre", "apellido", "email", "telefono", "clave"];

// Errores propios de las reglas de negocio; los inesperados se relanzan
// y asyncHandler los deriva a errorHandler.
const manejarError = (error, res) => {
  if (error.name === "ValidationError") {
    const mensaje = Object.values(error.errors)
      .map((e) => e.message)
      .join(". ");
    return res.status(400).json({ error: mensaje });
  }
  if (error.code === 11000) {
    return res
      .status(400)
      .json({ error: "El email ya se encuentra registrado" });
  }
  throw error;
};

// GET /usuarios
const obtenerUsuarios = async (req, res) => {
  const usuarios = await Usuario.obtenerTodos();
  res.status(200).json(usuarios);
};

// GET /usuarios/:id
const obtenerUsuarioPorId = async (req, res) => {
  const usuario = await Usuario.obtenerPorId(req.params.id);

  if (!usuario) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }

  res.status(200).json(usuario);
};

// POST /usuarios
const crearUsuario = async (req, res) => {
  const { nombre, apellido, email, telefono, clave } = req.body;

  if (!nombre || !apellido || !email || !clave) {
    return res
      .status(400)
      .json({ error: "Nombre, apellido, email y clave son obligatorios" });
  }

  // Regla de negocio: evitar emails duplicados
  const emailExistente = await Usuario.obtenerPorEmail(email);
  if (emailExistente) {
    return res
      .status(400)
      .json({ error: "El email ya se encuentra registrado" });
  }

  try {
    const nuevoUsuario = await Usuario.crear({
      nombre,
      apellido,
      email,
      telefono,
      clave,
    });
    res.status(201).json(nuevoUsuario);
  } catch (error) {
    manejarError(error, res);
  }
};

// PUT /usuarios/:id
const actualizarUsuario = async (req, res) => {
  const { id } = req.params;

  const usuarioExistente = await Usuario.obtenerPorId(id);
  if (!usuarioExistente) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }

  // Solo se aplican los campos editables (ignora id, estado y operadores como $set).
  const cambios = Object.fromEntries(
    CAMPOS_EDITABLES.filter((campo) => req.body[campo] !== undefined).map(
      (campo) => [campo, req.body[campo]],
    ),
  );

  // Si intenta cambiar el email, verificar que no pertenezca a otro usuario
  if (
    cambios.email &&
    String(cambios.email).trim().toLowerCase() !== usuarioExistente.email
  ) {
    const emailDuplicado = await Usuario.obtenerPorEmail(cambios.email);
    if (emailDuplicado) {
      return res
        .status(400)
        .json({ error: "El nuevo email ya está en uso por otro usuario" });
    }
  }

  try {
    const usuarioActualizado = await Usuario.actualizar(id, cambios);
    res.status(200).json(usuarioActualizado);
  } catch (error) {
    manejarError(error, res);
  }
};

// PATCH /usuarios/:id/estado  (reemplaza al DELETE: se desactiva, no se elimina)
const cambiarEstadoUsuario = async (req, res) => {
  const { estado } = req.body;

  if (!ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({
      error: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(", ")}`,
    });
  }

  const usuario = await Usuario.actualizar(req.params.id, { estado });
  if (!usuario) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }

  res.status(200).json(usuario);
};

export {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  cambiarEstadoUsuario,
};

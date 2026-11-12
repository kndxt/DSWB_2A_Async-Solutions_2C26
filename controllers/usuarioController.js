import bcrypt from "bcryptjs";
import Usuario, {
  ESTADOS_USUARIO,
  ESTADOS_VALIDOS,
  ROLES_USUARIO,
  ROLES_VALIDOS,
} from "../models/usuarioModel.js";
import { generarToken } from "../utils/jwt.js";
import {
  setearCookieToken,
  limpiarCookieToken,
} from "../utils/cookies.js";

// Campos que se pueden modificar con PUT. El estado tiene su propio endpoint.
const CAMPOS_EDITABLES = ["nombre", "apellido", "email", "telefono", "password"];

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
  const { nombre, apellido, email, telefono, password } = req.body;

  if (!nombre || !apellido || !email || !password) {
    return res
      .status(400)
      .json({ error: "Nombre, apellido, email y contraseña son obligatorios" });
  }

  // Regla de negocio: evitar emails duplicados
  const emailExistente = await Usuario.obtenerPorEmail(email);
  if (emailExistente) {
    return res
      .status(400)
      .json({ error: "El email ya se encuentra registrado" });
  }

  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const nuevoUsuario = await Usuario.crear({
      nombre,
      apellido,
      email,
      telefono,
      password: passwordHash,
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

  // Si se cambia la contraseña, hashearla
  if (cambios.password) {
    const saltRounds = 10;
    cambios.password = await bcrypt.hash(cambios.password, saltRounds);
  }

  try {
    const usuarioActualizado = await Usuario.actualizar(id, cambios);
    res.status(200).json(usuarioActualizado);
  } catch (error) {
    manejarError(error, res);
  }
};

// PATCH /usuarios/:id/estado
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

// PATCH /usuarios/:id/rol
const cambiarRolUsuario = async (req, res) => {
  const { rol } = req.body;

  if (!ROLES_VALIDOS.includes(rol)) {
    return res.status(400).json({
      error: `Rol inválido. Valores permitidos: ${ROLES_VALIDOS.join(", ")}`,
    });
  }

  const usuario = await Usuario.actualizar(req.params.id, { rol });
  if (!usuario) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }

  res.status(200).json(usuario);
};

// POST /usuarios/login
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Email y contraseña son obligatorios" });
  }

  const usuario = await Usuario.obtenerPorEmail(email);

  // Mismo mensaje si el usuario no existe o la contraseña no coincide:
  // no se revela qué emails están registrados.
  const passwordCorrecta =
    usuario && (await bcrypt.compare(password, usuario.password));

  if (!passwordCorrecta) {
    return res.status(401).json({ error: "Credenciales incorrectas" });
  }

  // Solo se informa que está inactivo a quien presentó credenciales correctas.
  if (usuario.estado === ESTADOS_USUARIO.INACTIVO) {
    return res.status(403).json({ error: "El usuario se encuentra inactivo" });
  }

  // Generar el token y setearlo en la cookie
  const token = generarToken(usuario);
  setearCookieToken(res, token);

  // El toJSON del modelo quita la password de la respuesta.
  res.status(200).json({
    mensaje: "Inicio de sesión exitoso",
    usuario,
    });
};

// POST /usuarios/logout
const logout = (req, res) => {
  limpiarCookieToken(res);
  res.status(200).json({ mensaje: "Sesión cerrada correctamente" });
};

export {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  cambiarEstadoUsuario,
  cambiarRolUsuario,
  login,
  logout,
};
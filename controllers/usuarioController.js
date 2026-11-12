import * as usuarioService from "../services/usuarioService.js";
import * as authService from "../services/authService.js";
import { setearCookieToken, limpiarCookieToken } from "../utils/cookies.js";

// GET /usuarios
const obtenerUsuarios = async (req, res) => {
  const usuarios = await usuarioService.obtenerTodos();
  res.status(200).json(usuarios);
};

// GET /usuarios/:id
const obtenerUsuarioPorId = async (req, res) => {
  const usuario = await usuarioService.obtenerPorId(req.params.id);
  res.status(200).json(usuario);
};

// POST /usuarios
const crearUsuario = async (req, res) => {
  const nuevoUsuario = await usuarioService.crear(req.body);
  res.status(201).json(nuevoUsuario);
};

// PUT /usuarios/:id
const actualizarUsuario = async (req, res) => {
  const usuarioActualizado = await usuarioService.actualizar(req.params.id, req.body);

  res.status(200).json(usuarioActualizado);
};

// PATCH /usuarios/:id/estado
const cambiarEstadoUsuario = async (req, res) => {
  const usuario = await usuarioService.cambiarEstado(req.params.id, req.body.estado);

  res.status(200).json(usuario);
};

// PATCH /usuarios/:id/rol
const cambiarRolUsuario = async (req, res) => {
  const usuario = await usuarioService.cambiarRol(req.params.id, req.body.rol);

  res.status(200).json(usuario);
};

// POST /usuarios/login
const login = async (req, res) => {
  const { email, password } = req.body;

  const { usuario, token } = await authService.login(email, password);

  setearCookieToken(res, token);

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

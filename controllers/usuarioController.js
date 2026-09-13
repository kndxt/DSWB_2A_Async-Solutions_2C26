const Usuario = require("../models/usuarioModel");

// GET /usuarios
const obtenerUsuarios = (req, res) => {
  try {
    const usuarios = Usuario.obtenerTodos();
    res.status(200).json(usuarios);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los usuarios" });
  }
};

// GET /usuarios/:id
const obtenerUsuarioPorId = (req, res) => {
  try {
    const { id } = req.params;
    const usuario = Usuario.obtenerPorId(id);

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.status(200).json(usuario);
  } catch (error) {
    res.status(500).json({ error: "Error al buscar el usuario" });
  }
};

// POST /usuarios
const crearUsuario = (req, res) => {
  try {
    const { nombre, apellido, email, telefono } = req.body;

    // Validaciones básicas de entrada
    if (!nombre || !apellido || !email) {
      return res
        .status(400)
        .json({ error: "Nombre, apellido y email son obligatorios" });
    }

    // Regla de negocio: evitar emails duplicados
    const emailExistente = Usuario.obtenerPorEmail(email);
    if (emailExistente) {
      return res
        .status(400)
        .json({ error: "El email ya se encuentra registrado" });
    }

    const nuevoUsuario = Usuario.crear({ nombre, apellido, email, telefono });
    res.status(201).json(nuevoUsuario);
  } catch (error) {
    res.status(500).json({ error: "Error al crear el usuario" });
  }
};

// PUT /usuarios/:id
const actualizarUsuario = (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    const usuarioExistente = Usuario.obtenerPorId(id);
    if (!usuarioExistente) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Si intenta cambiar el email, verificar que no pertenezca a otro usuario
    if (email && email.toLowerCase() !== usuarioExistente.email.toLowerCase()) {
      const emailDuplicado = Usuario.obtenerPorEmail(email);
      if (emailDuplicado) {
        return res
          .status(400)
          .json({ error: "El nuevo email ya está en uso por otro usuario" });
      }
    }

    const usuarioActualizado = Usuario.actualizar(id, req.body);
    res.status(200).json(usuarioActualizado);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar el usuario" });
  }
};

// DELETE /usuarios/:id
const eliminarUsuario = (req, res) => {
  try {
    const { id } = req.params;
    const eliminado = Usuario.eliminar(id);

    if (!eliminado) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.status(200).json({ mensaje: "Usuario eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar el usuario" });
  }
};

module.exports = {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
};

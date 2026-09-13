const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../data/usuarios.json");

class Usuario {
  constructor(id, nombre, apellido, email, telefono) {
    this.id = id;
    this.nombre = nombre;
    this.apellido = apellido;
    this.email = email;
    this.telefono = telefono;
  }

  // Leer todos los usuarios del archivo JSON
  static obtenerTodos() {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data || "[]");
  }

  // Guardar la lista completa de usuarios en el JSON
  static guardarTodos(usuarios) {
    fs.writeFileSync(filePath, JSON.stringify(usuarios, null, 2), "utf-8");
  }

  // Buscar usuario por ID
  static obtenerPorId(id) {
    const usuarios = this.obtenerTodos();
    return usuarios.find((u) => u.id === parseInt(id));
  }

  // Buscar usuario por Email (para evitar duplicados)
  static obtenerPorEmail(email) {
    const usuarios = this.obtenerTodos();
    return usuarios.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  // Crear un nuevo usuario
  static crear(nuevoUsuarioData) {
    const usuarios = this.obtenerTodos();
    const nuevoId =
      usuarios.length > 0 ? Math.max(...usuarios.map((u) => u.id)) + 1 : 1;

    const nuevoUsuario = new Usuario(
      nuevoId,
      nuevoUsuarioData.nombre,
      nuevoUsuarioData.apellido,
      nuevoUsuarioData.email,
      nuevoUsuarioData.telefono,
    );

    usuarios.push(nuevoUsuario);
    this.guardarTodos(usuarios);
    return nuevoUsuario;
  }

  // Actualizar un usuario existente
  static actualizar(id, datosActualizados) {
    const usuarios = this.obtenerTodos();
    const index = usuarios.findIndex((u) => u.id === parseInt(id));

    if (index === -1) return null;

    usuarios[index] = {
      ...usuarios[index],
      ...datosActualizados,
      id: parseInt(id), // Mantener el ID original
    };

    this.guardarTodos(usuarios);
    return usuarios[index];
  }

  // Eliminar un usuario por ID
  static eliminar(id) {
    const usuarios = this.obtenerTodos();
    const index = usuarios.findIndex((u) => u.id === parseInt(id));

    if (index === -1) return false;

    usuarios.splice(index, 1);
    this.guardarTodos(usuarios);
    return true;
  }
}

module.exports = Usuario;

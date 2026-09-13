const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../data/salas.json");

class Sala {
  constructor(id, nombre, capacidad, direccion, precioReserva, responsable) {
    this.id = id;
    this.nombre = nombre;
    this.capacidad = capacidad;
    this.direccion = direccion;
    this.precioReserva = precioReserva;
    this.responsable = responsable;
  }

  static obtenerTodos() {
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data || "[]");
  }

  static guardarTodos(salas) {
    fs.writeFileSync(filePath, JSON.stringify(salas, null, 2), "utf-8");
  }

  static obtenerPorId(id) {
    const salas = this.obtenerTodos();
    return salas.find((s) => s.id === parseInt(id));
  }

  static crear(data) {
    const salas = this.obtenerTodos();
    const nuevoId = salas.length > 0 ? Math.max(...salas.map((s) => s.id)) + 1 : 1;

    const nuevaSala = new Sala(
      nuevoId,
      data.nombre,
      data.capacidad,
      data.direccion,
      data.precioReserva,
      data.responsable,
    );

    salas.push(nuevaSala);
    this.guardarTodos(salas);
    return nuevaSala;
  }

  static actualizar(id, datosActualizados) {
    const salas = this.obtenerTodos();
    const index = salas.findIndex((s) => s.id === parseInt(id));
    if (index === -1) return null;

    salas[index] = { ...salas[index], ...datosActualizados, id: parseInt(id) };
    this.guardarTodos(salas);
    return salas[index];
  }
}

module.exports = Sala;
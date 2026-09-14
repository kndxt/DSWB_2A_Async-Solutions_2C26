const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../data/entradas.json");

// Estados posibles de una entrada, compartidos por todo el modelo.
const ESTADOS_ENTRADA = {
  VENDIDA: "vendida",
  CANCELADA: "cancelada",
};

class Entrada {
  constructor(id, eventoId, usuarioId, estado, fechaVenta) {
    this.id = id;
    this.eventoId = eventoId;
    this.usuarioId = usuarioId;
    this.estado = estado;
    this.fechaVenta = fechaVenta;
  }

  static obtenerTodos() {
    // Si el archivo todavía no existe, se considera que no hay entradas registradas.
    if (!fs.existsSync(filePath)) return [];

    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data || "[]");
  }

  static guardarTodos(entradas) {
    fs.writeFileSync(
      filePath,
      JSON.stringify(entradas, null, 2),
      "utf-8"
    );
  }

  static obtenerPorId(id) {
    const entradas = this.obtenerTodos();

    return entradas.find((entrada) => entrada.id === parseInt(id));
  }

  static obtenerPorEvento(eventoId) {
    const entradas = this.obtenerTodos();

    return entradas.filter(
      (entrada) => entrada.eventoId === parseInt(eventoId)
    );
  }

  static obtenerVendidasPorEvento(eventoId) {
    return this.obtenerPorEvento(eventoId).filter(
      (entrada) => entrada.estado === ESTADOS_ENTRADA.VENDIDA
    );
  }

  static obtenerVendidas() {
    return this.obtenerTodos().filter(
      (entrada) => entrada.estado === ESTADOS_ENTRADA.VENDIDA
    );
  }

  static crear(data) {
    const entradas = this.obtenerTodos();

    // Genera el siguiente ID disponible a partir del mayor ID registrado.
    const nuevoId =
      entradas.length > 0
        ? Math.max(...entradas.map((entrada) => entrada.id)) + 1
        : 1;

    // La venta registra automáticamente la fecha y hora en que fue realizada.
    const nuevaEntrada = new Entrada(
      nuevoId,
      parseInt(data.eventoId),
      parseInt(data.usuarioId),
      ESTADOS_ENTRADA.VENDIDA,
      new Date().toISOString()
    );

    entradas.push(nuevaEntrada);
    this.guardarTodos(entradas);

    return nuevaEntrada;
  }

  // La entrada no se elimina: se conserva el registro y se cambia su estado.
  static cancelar(id) {
    const entradas = this.obtenerTodos();

    const index = entradas.findIndex(
      (entrada) => entrada.id === parseInt(id)
    );

    if (index === -1) return null;

    entradas[index].estado = ESTADOS_ENTRADA.CANCELADA;

    this.guardarTodos(entradas);

    return entradas[index];
  }

  static obtenerDisponiblesPorEvento(eventoId, capacidad){
    const entradasVendidas = this.obtenerVendidasPorEvento(eventoId);
    return capacidad - entradasVendidas.length;
  }


}

module.exports = { Entrada, ESTADOS_ENTRADA };
const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../data/eventos.json");

const ESTADOS_EVENTO = {
  ACTIVO: "activo",
  FINALIZADO: "finalizado",
  CANCELADO: "cancelado"
};

const ESTADOS_VALIDOS = Object.values(ESTADOS_EVENTO);

class Evento {
  constructor(id, nombre, descripcion, tipo, fechaInicio, fechaFin, fechaInicioVenta, fechaFinVenta, precioEntrada, estado, salaId) {
    this.id = id;
    this.nombre = nombre;
    this.descripcion = descripcion;
    this.tipo = tipo;
    this.fechaInicio = fechaInicio;
    this.fechaFin = fechaFin;
    this.fechaInicioVenta = fechaInicioVenta;
    this.fechaFinVenta = fechaFinVenta;
    this.precioEntrada = precioEntrada;
    this.estado = estado;
    this.salaId = salaId;
  }

  static obtenerTodos() {
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data || "[]");
  }

  static guardarTodos(eventos) {
    fs.writeFileSync(filePath, JSON.stringify(eventos, null, 2), "utf-8");
  }

  static obtenerPorId(id) {
    const eventos = this.obtenerTodos();
    return eventos.find((e) => e.id === parseInt(id));
  }

  static obtenerPorSala(salaId) {
    const eventos = this.obtenerTodos();
    return eventos.filter((e) => e.salaId === parseInt(salaId));
  }

  static crear(data) {
    const eventos = this.obtenerTodos();
    const nuevoId = eventos.length > 0 ? Math.max(...eventos.map((e) => e.id)) + 1 : 1;

    const nuevoEvento = new Evento(
      nuevoId,
      data.nombre,
      data.descripcion,
      data.tipo,
      data.fechaInicio,
      data.fechaFin,
      data.fechaInicioVenta,
      data.fechaFinVenta,
      data.precioEntrada,
      "activo",
      parseInt(data.salaId),
    );

    eventos.push(nuevoEvento);
    this.guardarTodos(eventos);
    return nuevoEvento;
  }

  static actualizar(id, datosActualizados) {
    const eventos = this.obtenerTodos();
    const index = eventos.findIndex((e) => e.id === parseInt(id));
    if (index === -1) return null;

    eventos[index] = { ...eventos[index], ...datosActualizados, id: parseInt(id) };
    this.guardarTodos(eventos);
    return eventos[index];
  }

  // Verifica que el evento esté activo y dentro de su período de venta.
  /*
   * Los eventos recuperados del JSON son objetos planos y no instancias de Evento.
   * Por este motivo, la validación se implementa como
   * método estático y recibe el evento como parámetro.
   */

  static puedeVenderEntradas(evento) {

    if (evento.estado !== ESTADOS_EVENTO.ACTIVO) return false;

    const hoy = new Date();
    const inicioVenta = new Date(evento.fechaInicioVenta);
    const finVenta = new Date(evento.fechaFinVenta);

    return hoy >= inicioVenta && hoy <= finVenta;
  }
}

module.exports = { Evento, ESTADOS_VALIDOS };
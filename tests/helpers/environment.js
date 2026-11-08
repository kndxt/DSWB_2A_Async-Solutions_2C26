import "dotenv/config";
import http from "node:http";
import mongoose from "mongoose";
import app from "../../app.js";
import { conectarDB } from "../../config/db.js";
import Usuario from "../../models/usuarioModel.js";
import Sala from "../../models/salaModel.js";
import { Evento } from "../../models/eventoModel.js";
import Entrada from "../../models/entradaModel.js";

const modelos = [Entrada, Evento, Sala, Usuario];
const registrosCreados = new Map(modelos.map((modelo) => [modelo, new Set()]));
let server;
let baseURL;
let secuencia = 0;

export async function iniciarEntorno() {
  await conectarDB();

  // Las pruebas usan la base local configurada en MONGODB_URI. Nunca se vacía.
  console.log(`\n[tests] MongoDB: ${mongoose.connection.name} (${mongoose.connection.host})`);

  server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const { port } = server.address();
  baseURL = `http://127.0.0.1:${port}`;
}

export async function cerrarEntorno() {
  await limpiarRegistros();
  if (server?.listening) {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
  await mongoose.disconnect();
}

export async function limpiarRegistros() {
  for (const modelo of modelos) {
    const ids = [...registrosCreados.get(modelo)];
    if (ids.length) await modelo.deleteMany({ _id: { $in: ids } });
    registrosCreados.get(modelo).clear();
  }
}

export function registrarCreado(modelo, documento) {
  if (documento?._id) registrosCreados.get(modelo).add(documento._id);
  return documento;
}

export function siguienteSufijo() {
  secuencia += 1;
  return `${Date.now()}_${secuencia}`;
}

export async function peticion(ruta, { method = "GET", body, headers = {}, redirect = "follow" } = {}) {
  const opciones = { method, headers: { ...headers }, redirect };
  if (body !== undefined) {
    opciones.headers["content-type"] = "application/json";
    opciones.body = JSON.stringify(body);
  }
  return fetch(`${baseURL}${ruta}`, opciones);
}

export async function respuestaJSON(response) {
  return response.json();
}

export async function crearUsuario(overrides = {}) {
  const sufijo = siguienteSufijo();
  const usuario = await Usuario.create({
    nombre: "Usuario",
    apellido: "Prueba",
    email: `test_${sufijo}@example.test`,
    telefono: "11111111",
    password: "clave-prueba",
    ...overrides,
  });
  return registrarCreado(Usuario, usuario);
}

export async function crearSala(overrides = {}) {
  const sufijo = siguienteSufijo();
  const sala = await Sala.create({
    nombre: `Sala de prueba ${sufijo}`,
    capacidad: 50,
    direccion: "Dirección de prueba 123",
    precioReserva: 1000,
    responsable: {
      nombre: "Responsable",
      apellido: "Prueba",
      telefono: "1122223333",
      email: `responsable_${sufijo}@example.test`,
    },
    ...overrides,
  });
  return registrarCreado(Sala, sala);
}

export function fechasEvento({ dias = 30, duracion = 1 } = {}) {
  const inicio = new Date();
  inicio.setDate(inicio.getDate() + dias);
  inicio.setHours(20, 0, 0, 0);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + duracion);
  const inicioVenta = new Date();
  inicioVenta.setDate(inicioVenta.getDate() - 1);
  const finVenta = new Date(inicio);
  finVenta.setDate(finVenta.getDate() - 1);
  return {
    fechaInicio: inicio.toISOString(),
    fechaFin: fin.toISOString(),
    fechaInicioVenta: inicioVenta.toISOString(),
    fechaFinVenta: finVenta.toISOString(),
  };
}

export async function crearEvento({ sala, usuario, overrides = {}, dias = 30 } = {}) {
  const salaFinal = sala ?? await crearSala();
  const usuarioFinal = usuario ?? await crearUsuario();
  const sufijo = siguienteSufijo();
  const evento = await Evento.create({
    nombre: `Evento de prueba ${sufijo}`,
    tipo: "Teatro",
    ...fechasEvento({ dias }),
    precioEntrada: 2500,
    salaId: salaFinal._id,
    reserva: {
      usuarioId: usuarioFinal._id,
      fechaReserva: new Date(),
      precioFinal: salaFinal.precioReserva,
    },
    ...overrides,
  });
  return registrarCreado(Evento, evento);
}

export async function crearEntrada({ evento, usuario, overrides = {} } = {}) {
  const eventoFinal = evento ?? await crearEvento();
  const usuarioFinal = usuario ?? await crearUsuario();
  const entrada = await Entrada.create({
    eventoId: eventoFinal._id,
    usuarioId: usuarioFinal._id,
    ...overrides,
  });
  return registrarCreado(Entrada, entrada);
}

export { mongoose, Usuario, Sala, Evento, Entrada };

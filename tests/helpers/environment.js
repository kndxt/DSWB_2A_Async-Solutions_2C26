import "dotenv/config";
import http from "node:http";
import mongoose from "mongoose";
import { io as clienteSocketIO } from "socket.io-client";
import bcrypt from "bcryptjs";
import app from "../../app.js";
import { conectarDB } from "../../config/db.js";
import { inicializarSockets, cerrarSockets } from "../../sockets/index.js";

import Usuario from "../../models/usuarioModel.js";
import { ROLES_USUARIO } from "../../definitions/usuario.js";
import Sala from "../../models/salaModel.js";
import { Evento } from "../../models/eventoModel.js";
import Entrada from "../../models/entradaModel.js";

import { generarToken } from "../../utils/jwt.js";

// ---------------------------------------------------------------
// Configuración y estado del entorno de pruebas
// ---------------------------------------------------------------

// Modelos cuyos registros pueden crearse durante las pruebas.
const modelos = [Entrada, Evento, Sala, Usuario];

// Guarda los IDs de los documentos creados para eliminarlos al finalizar.
const registrosCreados = new Map(modelos.map((modelo) => [modelo, new Set()]));

// Mantiene el control de los clientes Socket.IO creados durante las pruebas.
const clientesSocket = new Set();

let server;
let baseURL;
let secuencia = 0;

// ---------------------------------------------------------------
// Entorno HTTP y base de datos
// ---------------------------------------------------------------

/**
 * Conecta la base de datos e inicia un servidor HTTP temporal.
 *
 * Las pruebas utilizan la base configurada en MONGODB_URI.
 * No se vacía la base: solo se eliminan los registros creados
 * y registrados explícitamente por los helpers.
 *
 * Con { sockets: true } también inicializa Socket.IO.
 */
export async function iniciarEntorno({ sockets = false } = {}) {
  await conectarDB();

  console.log(`\n[tests] MongoDB: ${mongoose.connection.name} (${mongoose.connection.host})`);

  server = http.createServer(app);

  if (sockets) {
    inicializarSockets(server);
  }

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const { port } = server.address();
  baseURL = `http://127.0.0.1:${port}`;
}

/**
 * Cierra los clientes Socket.IO, limpia los registros creados,
 * cierra los servidores y desconecta MongoDB.
 */
export async function cerrarEntorno() {
  cerrarClientes();
  await limpiarRegistros();

  // Si Socket.IO fue inicializado, su cierre también puede cerrar
  // el servidor HTTP.
  await cerrarSockets();

  if (server?.listening) {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }

  await mongoose.disconnect();
}

// ---------------------------------------------------------------
// Limpieza y registro de documentos
// ---------------------------------------------------------------

/**
 * Elimina únicamente los documentos registrados durante las pruebas.
 */
export async function limpiarRegistros() {
  for (const modelo of modelos) {
    const ids = [...registrosCreados.get(modelo)];

    if (ids.length) {
      await modelo.deleteMany({ _id: { $in: ids } });
    }

    registrosCreados.get(modelo).clear();
  }
}

/**
 * Registra un documento para eliminarlo al finalizar las pruebas.
 * Devuelve el mismo documento para poder encadenar su uso.
 */
export function registrarCreado(modelo, documento) {
  if (documento?._id) {
    registrosCreados.get(modelo).add(documento._id);
  }

  return documento;
}

/**
 * Genera un sufijo único para evitar colisiones entre datos de prueba.
 */
export function siguienteSufijo() {
  secuencia += 1;
  return `${Date.now()}_${secuencia}`;
}

// ---------------------------------------------------------------
// Peticiones HTTP
// ---------------------------------------------------------------

/**
 * Realiza una petición HTTP al servidor temporal.
 *
 * Permite configurar método, cuerpo, encabezados y redirecciones.
 * Si se proporciona un body, lo envía como JSON.
 */
export async function peticion(
  ruta,
  { method = "GET", body, headers = {}, redirect = "follow" } = {},
) {
  const opciones = {
    method,
    headers: { ...headers },
    redirect,
  };

  if (body !== undefined) {
    opciones.headers["content-type"] = "application/json";
    opciones.body = JSON.stringify(body);
  }

  return fetch(`${baseURL}${ruta}`, opciones);
}

/**
 * Convierte el cuerpo de una respuesta HTTP a JSON.
 */
export async function respuestaJSON(response) {
  return response.json();
}

// ---------------------------------------------------------------
// Sesiones y autenticación
// ---------------------------------------------------------------

/**
 * Genera una cookie de sesión para autenticar peticiones a la API.
 *
 * Utiliza el usuario recibido para generar un JWT real y devuelve
 * el encabezado Cookie que espera el middleware de autenticación.
 *
 * El usuario debe tener un ID y un rol válidos.
 */
export function crearSesion(usuario) {
  const token = generarToken(usuario);

  return {
    Cookie: `token=${token}`,
  };
}

// ---------------------------------------------------------------
// Clientes de Socket.IO
// ---------------------------------------------------------------

/**
 * Crea un cliente Socket.IO sin conectarlo.
 *
 * Desactiva la reconexión automática para que cada prueba controle
 * cuándo se conecta y desconecta. Las opciones recibidas permiten
 * agregar encabezados, como una cookie de sesión.
 */
export function crearClienteSocket(opciones = {}) {
  const cliente = clienteSocketIO(baseURL, {
    autoConnect: false,
    reconnection: false,
    transports: ["websocket"],
    ...opciones,
  });

  clientesSocket.add(cliente);

  return cliente;
}

/**
 * Crea un cliente Socket.IO y espera a que se conecte.
 *
 * Si el servidor rechaza la conexión, la promesa se rechaza
 * con el error recibido.
 */
export async function conectarCliente(opciones = {}) {
  const cliente = crearClienteSocket(opciones);

  await new Promise((resolve, reject) => {
    cliente.once("connect", resolve);
    cliente.once("connect_error", reject);
    cliente.connect();
  });

  return cliente;
}

/**
 * Desconecta todos los clientes Socket.IO creados por los helpers.
 */
export function cerrarClientes() {
  for (const cliente of clientesSocket) {
    cliente.disconnect();
  }

  clientesSocket.clear();
}

/**
 * Espera el próximo evento de un socket y devuelve su primer argumento.
 *
 * Si el evento no llega dentro del tiempo máximo, rechaza la promesa.
 */
export function esperarEvento(socket, evento, tiempoMaximo = 2000) {
  return new Promise((resolve, reject) => {
    const temporizador = setTimeout(
      () => reject(new Error(`Se agotó el tiempo esperando el evento "${evento}"`)),
      tiempoMaximo,
    );

    socket.once(evento, (datos) => {
      clearTimeout(temporizador);
      resolve(datos);
    });
  });
}

/**
 * Reintenta una condición hasta que se cumple o se agota el tiempo.
 */
export async function esperarHasta(condicion, tiempoMaximo = 2000, intervalo = 20) {
  const limite = Date.now() + tiempoMaximo;

  while (Date.now() < limite) {
    if (await condicion()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalo));
  }

  throw new Error("Se agotó el tiempo esperando que se cumpla la condición");
}

// ---------------------------------------------------------------
// Fixtures: usuarios, salas, eventos y entradas
// ---------------------------------------------------------------

/**
 * Crea un usuario de prueba.
 *
 * Permite sobrescribir sus datos, por ejemplo, para crear
 * administradores o usuarios inactivos.
 */
export const crearUsuario = async (overrides = {}) => {
  const { password = "clave-prueba", ...datos } = overrides;

  const usuario = await Usuario.create({
    nombre: "Usuario",
    apellido: "Prueba",
    email: `usuario-${Date.now()}-${Math.random()}@example.test`,
    telefono: "1122334455",
    ...datos,
    password: await bcrypt.hash(password, 10),
  });

  return registrarCreado(Usuario, usuario);
};

/**
 * Crea una sala de prueba con datos válidos.
 *
 * Permite sobrescribir sus propiedades para probar distintos estados.
 */
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

/**
 * Genera fechas válidas para un evento.
 *
 * Por defecto, el evento comienza dentro de 30 días y dura un día.
 * Las fechas de venta se calculan en relación con el inicio del evento.
 */
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

/**
 * Crea un evento directamente en la base de datos.
 *
 * Si no recibe sala o usuario, crea los documentos necesarios.
 * La reserva se genera con el precio configurado en la sala.
 */
export async function crearEvento({ sala, usuario, overrides = {}, dias = 30 } = {}) {
  const salaFinal = sala ?? (await crearSala());
  const usuarioFinal = usuario ?? (await crearUsuario());
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

/**
 * Crea una entrada directamente en la base de datos.
 *
 * Si no recibe evento o usuario, crea los documentos necesarios.
 */
export async function crearEntrada({ evento, usuario, overrides = {} } = {}) {
  const eventoFinal = evento ?? (await crearEvento());
  const usuarioFinal = usuario ?? (await crearUsuario());

  const entrada = await Entrada.create({
    eventoId: eventoFinal._id,
    usuarioId: usuarioFinal._id,
    ...overrides,
  });

  return registrarCreado(Entrada, entrada);
}

// ---------------------------------------------------------------
// Exportaciones para las pruebas
// ---------------------------------------------------------------

export { mongoose, Usuario, Sala, Evento, Entrada, ROLES_USUARIO };

import { Server } from "socket.io";
import { registrarAuth } from "./authSocket.js";
import { registrarChat } from "./chatSocket.js";

// Instancia única de Socket.IO, compartida por todos los módulos.
let io = null;

// Módulos que registran sus eventos sobre la instancia de Socket.IO.
// Cada módulo exporta una función que recibe `io` y registra lo suyo:
// middlewares de handshake con io.use() y manejadores con io.on("connection").
// El orden importa: los middlewares de handshake deben registrarse antes que los manejadores de conexión.
const MODULOS = [
  (io) => registrarAuth(io), // Middleware de autenticación del handshake.
  (io, opcionesChat) => registrarChat(io, opcionesChat), // Eventos del chat para conexiones autenticadas.
];

// Inicializa Socket.IO sobre el servidor HTTP que también usa Express.
// Se llama una sola vez, desde server.js.
export function inicializarSockets(httpServer, opcionesChat = {}) {
  if (io) return io;

  io = new Server(httpServer, {
    maxHttpBufferSize: 16 * 1024, // limite de tamaño
  });

  io.on("connection", (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    socket.on("disconnect", (motivo) => {
      console.log(`Cliente desconectado: ${socket.id} (${motivo})`);
    });
  });

  for (const registrar of MODULOS) {
    registrar(io, opcionesChat);
  }

  return io;
}

// Permite que otros módulos usen la instancia sin acoplarse a server.js.
export function obtenerIO() {
  if (!io) {
    throw new Error("Socket.IO no fue inicializado.");
  }
  return io;
}

// Cierra las conexiones, libera la instancia y cierra el servidor HTTP asociado.
// Se usa al apagar el servidor y en las pruebas; es seguro llamarla más de una vez.
export function cerrarSockets() {
  if (!io) return Promise.resolve();

  const instancia = io;
  io = null;

  return new Promise((resolve) => {
    instancia.close(() => resolve());
  });
}

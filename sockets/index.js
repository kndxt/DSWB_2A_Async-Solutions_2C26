import { Server } from "socket.io";

// Instancia única de Socket.IO, compartida por todos los módulos.
let io = null;

// Inicializa Socket.IO sobre el servidor HTTP que también usa Express.
// Se llama una sola vez, desde server.js.
export function inicializarSockets(httpServer) {
  if (io) return io;

  io = new Server(httpServer);

  io.on("connection", (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    // F10 registrará acá los manejadores del chat (mensajes, Gemini).

    socket.on("disconnect", (motivo) => {
      console.log(`Cliente desconectado: ${socket.id} (${motivo})`);
    });
  });

  return io;
}

// Permite que otros módulos usen la instancia sin acoplarse a server.js.
export function obtenerIO() {
  if (!io) {
    throw new Error("Socket.IO no fue inicializado.");
  }
  return io;
}
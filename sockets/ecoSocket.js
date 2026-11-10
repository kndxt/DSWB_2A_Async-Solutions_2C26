// Eventos temporales de F10.1 para comprobar la emisión y la recepción entre
// varios clientes. Se eliminan en F10.3, cuando el chat los reemplaza.

export const EVENTOS_ECO = {
  ECO: "eco",
  DIFUSION: "eco:difusion",
};

export function registrarEco(io) {
  // Estos eventos no exigen autenticación, así que no se exponen en producción.
  if (process.env.NODE_ENV === "production") return;

  io.on("connection", (socket) => {
    // Responde únicamente al cliente que envió el evento.
    socket.on(EVENTOS_ECO.ECO, (datos) => {
      socket.emit(EVENTOS_ECO.ECO, datos);
    });

    // Reenvía el evento a todos los clientes conectados, incluido el emisor.
    socket.on(EVENTOS_ECO.DIFUSION, (datos) => {
      io.emit(EVENTOS_ECO.DIFUSION, datos);
    });
  });
}
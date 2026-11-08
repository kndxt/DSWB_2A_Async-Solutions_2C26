import "dotenv/config";
import http from "node:http";

import app from "./app.js";
import { conectarDB } from "./config/db.js";
import { inicializarSockets } from "./sockets/index.js";

const PORT = process.env.PORT || 3000;

// El servidor HTTP es compartido por Express y Socket.IO.
const server = http.createServer(app);
inicializarSockets(server);

// El servidor solo empieza a escuchar si la conexión a MongoDB fue exitosa.
try {
  await conectarDB();

  server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
} catch (error) {
  console.error("No se pudo iniciar el servidor:", error.message);
  process.exitCode = 1;
}
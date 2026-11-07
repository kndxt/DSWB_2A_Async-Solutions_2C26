import "dotenv/config";
import http from "node:http";

import app from "./app.js";
import { conectarDB } from "./config/db.js";

const PORT = process.env.PORT || 3000;

// Se crea el servidor HTTP a partir de la app para poder
// engancharle Socket.IO más adelante
const server = http.createServer(app);

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
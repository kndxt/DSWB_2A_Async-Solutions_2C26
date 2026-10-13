import express from "express";

import dotenv from "dotenv";
import { conectarDB } from "./config/db.js";

import usuarioRoutes from "./routes/usuarioRoutes.js";
import salaRoutes from "./routes/salaRoutes.js";
import eventoRoutes from "./routes/eventoRoutes.js";
import entradaRoutes from "./routes/entradaRoutes.js";
import vistasRoutes from "./routes/vistasRoutes.js";


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para procesar datos en JSON
app.use(express.json());

// Configuración del motor de vistas
app.set("view engine", "pug");
app.set("views", "./views");

// Rutas de los módulos
app.use("/usuarios", usuarioRoutes);
app.use("/salas", salaRoutes);
app.use("/eventos", eventoRoutes);
app.use("/entradas", entradaRoutes);
app.use("/vistas", vistasRoutes);

app.get("/", (req, res) => {
  res.send("Servidor Express activo y seguro.");
});

// Conectamos a MongoDB antes de levantar el servidor.
try {
  await conectarDB();

  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);

  });

} catch (error) {
  console.error("No se pudo iniciar el servidor:", error.message);
  process.exitCode = 1;
}

import express from "express";
import usuarioRoutes from "./routes/usuarioRoutes.js";
import salaRoutes from "./routes/salaRoutes.js";
import eventoRoutes from "./routes/eventoRoutes.js";
import entradaRoutes from "./routes/entradaRoutes.js";
import vistasRoutes from "./routes/vistasRoutes.js";
import notFound from "./middlewares/notFound.js";

const app = express();
const PORT = 3000;

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

// Middleware para manejar rutas no encontradas
app.use(notFound); 

app.get("/", (req, res) => {
  res.send("Servidor Express activo y seguro.");
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

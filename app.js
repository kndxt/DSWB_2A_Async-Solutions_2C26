const express = require("express");
const app = express();
const PORT = 3000;

// Middleware para procesar datos en JSON
app.use(express.json());

// Configuración del motor de vistas
app.set("view engine", "pug");
app.set("views", "./views");

// Importar y conectar rutas del módulo Usuarios
const usuarioRoutes = require("./routes/usuarioRoutes");
app.use("/usuarios", usuarioRoutes);

// Importar y conectar rutas del módulo Salas
const salaRoutes = require("./routes/salaRoutes");
app.use("/salas", salaRoutes);

// Importar y conectar rutas del módulo Eventos
const eventoRoutes = require("./routes/eventoRoutes");
app.use("/eventos", eventoRoutes);

// Importar y conectar rutas del módulo Entradas
const entradaRoutes = require("./routes/entradaRoutes");
app.use("/entradas", entradaRoutes);

// Importar y conectar rutas del módulo Vistas
//
const vistasRoutes = require("./routes/vistasRoutes");
app.use("/vistas", vistasRoutes);

app.get("/", (req, res) => {
  res.send("Servidor Express activo y seguro.");
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

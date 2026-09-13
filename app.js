const express = require("express");
const app = express();
const PORT = 3000;

// Middleware para procesar datos en JSON
app.use(express.json());

// Importar y conectar rutas del módulo Usuarios
const usuarioRoutes = require("./routes/usuarioRoutes");
app.use("/usuarios", usuarioRoutes);

// Importar y conectar rutas del módulo Salas
const salaRoutes = require("./routes/salaRoutes");
app.use("/salas", salaRoutes);

// Importar y conectar rutas del módulo Eventos
const eventoRoutes = require("./routes/eventoRoutes");
app.use("/eventos", eventoRoutes);


app.get("/", (req, res) => {
  res.send("Servidor Express activo y seguro.");
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

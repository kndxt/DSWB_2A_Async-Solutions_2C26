const express = require("express");
const app = express();
const PORT = 3000;

// Middleware para procesar datos en JSON
app.use(express.json());

// Importar y conectar rutas del módulo Usuarios
const usuarioRoutes = require("./routes/usuarioRoutes");
app.use("/usuarios", usuarioRoutes);

app.get("/", (req, res) => {
  res.send("Servidor Express activo y seguro.");
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

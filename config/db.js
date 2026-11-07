import mongoose from "mongoose";

// Los errores del driver pueden incluir fragmentos de la URI
// Antes de mostrarlos se tapan el usuario y la contraseña.
const ocultarCredenciales = (texto) =>
  texto.replace(/(mongodb(?:\+srv)?:\/\/)[^@\s]+@/g, "$1***@");

// Eventos de la conexión: se registran una sola vez al cargar el módulo.
mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB se desconectó. Mongoose intentará reconectar.");
});
mongoose.connection.on("reconnected", () => {
  console.log("Conexión con MongoDB restablecida.");
});

export async function conectarDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("La variable MONGODB_URI no está definida.");
  }

  // readyState 1 = ya conectado: se reutiliza en vez de abrir otra conexión.
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  } catch (error) {
    throw new Error(ocultarCredenciales(error.message), { cause: error });
  }

  // Se informa host y base (nunca la URI completa) para detectar a tiempo
  // si se está apuntando a una base equivocada, por ejemplo "test".
  const { host, name } = mongoose.connection;
  console.log(`Conexión con MongoDB establecida (base: ${name}, host: ${host}).`);

  return mongoose.connection;
}
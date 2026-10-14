import mongoose from "mongoose";

export async function conectarDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("La variable MONGODB_URI no está definida.");
  }

  await mongoose.connect(uri);
  console.log("Conexión con MongoDB establecida correctamente.");
}
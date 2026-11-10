import mongoose from "mongoose";
import { ESTADOS_USUARIO } from "../../models/usuarioModel.js";
import { CANTIDAD_USUARIOS, USUARIOS_INACTIVOS } from "./config.js";

const nombres = [
  "Lucía", "Mateo", "Sofía", "Tomás", "Valentina",
  "Joaquín", "Camila", "Benjamín", "Martina", "Nicolás",
  "Julieta", "Santiago", "Agustina", "Facundo", "Florencia",
  "Lautaro", "Emilia", "Franco", "Catalina", "Bruno",
];

const apellidos = [
  "Gómez", "Pérez", "Rodríguez", "Fernández", "López",
  "Martínez", "Díaz", "Sánchez", "Romero", "Torres",
  "Álvarez", "Ruiz", "Acosta", "Medina", "Herrera",
  "Castro", "Suárez", "Rojas", "Silva", "Molina",
];

// Los últimos usuarios quedan inactivos para probar las ventas bloqueadas.
// F7 agregará el rol y el hash de contraseña: se ajusta solo acá.
export const generarUsuarios = () => {
  if (nombres.length < CANTIDAD_USUARIOS || apellidos.length < CANTIDAD_USUARIOS) {
    throw new Error("Faltan nombres o apellidos para generar la cantidad de usuarios configurada.");
  }

  return Array.from({ length: CANTIDAD_USUARIOS }, (_, i) => ({
    _id: new mongoose.Types.ObjectId(),
    nombre: nombres[i],
    apellido: apellidos[i],
    email: `usuario${i + 1}@example.com`,
    telefono: `119000${String(i + 1).padStart(4, "0")}`,
    estado:
      i >= CANTIDAD_USUARIOS - USUARIOS_INACTIVOS
        ? ESTADOS_USUARIO.INACTIVO
        : ESTADOS_USUARIO.ACTIVO,
    // Credencial ficticia, solo para pruebas.
    password: `Prueba${String(i + 1).padStart(3, "0")}!`,
  }));
};
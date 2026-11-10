import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import {
  ESTADOS_USUARIO,
  ROLES_USUARIO,
} from "../../models/usuarioModel.js";
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

// El primer usuario es admin, el resto cliente.
// Los últimos quedan inactivos para probar ventas bloqueadas.
export const generarUsuarios = async () => {
  if (nombres.length < CANTIDAD_USUARIOS || apellidos.length < CANTIDAD_USUARIOS) {
    throw new Error(
      "Faltan nombres o apellidos para generar la cantidad de usuarios configurada.",
    );
  }

  const saltRounds = 10;

  return Promise.all(
    Array.from({ length: CANTIDAD_USUARIOS }, async (_, i) => {
      const passwordPlano = `Prueba${String(i + 1).padStart(3, "0")}!`;
      const passwordHash = await bcrypt.hash(passwordPlano, saltRounds);

      return {
        _id: new mongoose.Types.ObjectId(),
        nombre: nombres[i],
        apellido: apellidos[i],
        email: `usuario${i + 1}@example.com`,
        telefono: `119000${String(i + 1).padStart(4, "0")}`,
        estado:
          i >= CANTIDAD_USUARIOS - USUARIOS_INACTIVOS
            ? ESTADOS_USUARIO.INACTIVO
            : ESTADOS_USUARIO.ACTIVO,
        rol: i === 0 ? ROLES_USUARIO.ADMIN : ROLES_USUARIO.CLIENTE,
        password: passwordHash,
      };
    }),
  );
};
import mongoose from "mongoose";
import { ESTADOS_SALA } from "../../models/salaModel.js";
import { CANTIDAD_SALAS, SALAS_INACTIVAS, CAPACIDAD_SALA_CHICA } from "./config.js";

const SALAS_POR_RESPONSABLE = 3;

// 7 responsables para 20 salas, hasta 3 salas por responsable.
const responsables = [
  { nombre: "Andrea", apellido: "Morales", telefono: "1100000001", email: "andrea.morales@example.com" },
  { nombre: "Pablo", apellido: "Benítez", telefono: "1100000002", email: "pablo.benitez@example.com" },
  { nombre: "Carolina", apellido: "Vega", telefono: "1100000003", email: "carolina.vega@example.com" },
  { nombre: "Diego", apellido: "Navarro", telefono: "1100000004", email: "diego.navarro@example.com" },
  { nombre: "Mariana", apellido: "Ortiz", telefono: "1100000005", email: "mariana.ortiz@example.com" },
  { nombre: "Gabriel", apellido: "Suárez", telefono: "1100000006", email: "gabriel.suarez@example.com" },
  { nombre: "Paula", apellido: "Ibarra", telefono: "1100000007", email: "paula.ibarra@example.com" },
];

export const generarSalas = () => {
  if (responsables.length * SALAS_POR_RESPONSABLE < CANTIDAD_SALAS) {
    throw new Error("Faltan responsables para generar la cantidad de salas configurada.");
  }

  return Array.from({ length: CANTIDAD_SALAS }, (_, i) => ({
    _id: new mongoose.Types.ObjectId(),
    nombre: `Sala de prueba ${i + 1}`,
    capacidad: i === 0 ? CAPACIDAD_SALA_CHICA : 40 + i * 5,
    direccion: `Calle de prueba ${100 + i}, CABA`,
    precioReserva: 10000 + i * 1500,
    // Las últimas salas quedan inactivas.
    estado: i >= CANTIDAD_SALAS - SALAS_INACTIVAS ? ESTADOS_SALA.INACTIVA : ESTADOS_SALA.ACTIVA,
    responsable: { ...responsables[Math.floor(i / SALAS_POR_RESPONSABLE)] },
  }));
};
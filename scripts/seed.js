// Carga datos de prueba en la base elegida con --destino.
// Borra usuarios, salas, eventos y entradas de esa base (no otras colecciones).
//
//   npm run seed         -> --destino=atlas (usa MONGODB_URI del .env)
//   npm run seed:local   -> --destino=local (usa MONGODB_URI_LOCAL o la base local por defecto)
import "dotenv/config";
import readline from "node:readline/promises";
import mongoose from "mongoose";

import Usuario from "../models/usuarioModel.js";
import Sala from "../models/salaModel.js";
import { Evento } from "../models/eventoModel.js";
import { Entrada } from "../models/entradaModel.js";
import { ocultarCredenciales } from "../config/db.js";

import { generarDatos } from "./seeds/index.js";
import { validarDatos } from "./seeds/validar.js";

const URI_LOCAL_POR_DEFECTO = "mongodb://127.0.0.1:27017/urbana_cult_dev";

const DESTINOS = {
  local: () => process.env.MONGODB_URI_LOCAL || URI_LOCAL_POR_DEFECTO,
  atlas: () => process.env.MONGODB_URI,
};

const leerArgumento = (nombre) =>
  process.argv.find((arg) => arg.startsWith(`--${nombre}=`))?.split("=")[1];

const tieneBandera = (nombre) => process.argv.includes(`--${nombre}`);

// El destino remoto solo admite bases de desarrollo, salvo autorización explícita.
const verificarBaseSegura = (destino, nombreBase) => {
  if (destino === "atlas" && !nombreBase.endsWith("_dev") && !tieneBandera("permitir-produccion")) {
    throw new Error(
      `La base "${nombreBase}" no termina en "_dev", así que podría ser la de producción. ` +
        "Se cancela sin modificar nada. Para forzarlo, agregá --permitir-produccion.",
    );
  }
};

// Hay que escribir el nombre de la base. Solo el destino local admite --yes.
const confirmar = async (destino, nombreBase) => {
  if (destino === "local" && tieneBandera("yes")) return;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const respuesta = await rl.question(
    `Se borrarán usuarios, salas, eventos y entradas de "${nombreBase}".\n` +
      "Para continuar, escribí el nombre de la base: ",
  );
  rl.close();

  if (respuesta.trim() !== nombreBase) {
    throw new Error("Confirmación incorrecta. No se modificó nada.");
  }
};

const seed = async () => {
  try {
    const destino = leerArgumento("destino");
    if (!DESTINOS[destino]) {
      throw new Error("Indicá el destino: --destino=local o --destino=atlas.");
    }

    const uri = DESTINOS[destino]();
    if (!uri) {
      throw new Error("Falta configurar MONGODB_URI en el archivo .env para el destino atlas.");
    }

    // Se genera y valida antes de tocar la base: si algo falla, no se borra nada.
    const datos = generarDatos();
    await validarDatos(datos);

    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    } catch (error) {
      throw new Error(ocultarCredenciales(error.message));
    }

    const { name, host } = mongoose.connection;
    console.log(`Destino: ${destino}`);
    console.log(`Base de datos: ${name}`);
    console.log(`Host: ${host}`);

    verificarBaseSegura(destino, name);
    await confirmar(destino, name);

    // Se eliminan primero los documentos dependientes.
    await Entrada.deleteMany({});
    await Evento.deleteMany({});
    await Sala.deleteMany({});
    await Usuario.deleteMany({});

    await Usuario.insertMany(datos.usuarios);
    await Sala.insertMany(datos.salas);
    await Evento.insertMany(datos.eventos);
    await Entrada.insertMany(datos.entradas);

    console.log("Seed completado.");
    for (const [coleccion, docs] of Object.entries(datos)) {
      console.log(`${coleccion}: ${docs.length}`);
    }
  } catch (error) {
    console.error("Error al ejecutar el seed:");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

await seed();
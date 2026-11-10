import { generarDatos } from "./seeds/index.js";
import { validarDatos } from "./seeds/validar.js";

const datos = await generarDatos();
await validarDatos(datos);

console.log("Datos de prueba válidos.");
for (const [coleccion, docs] of Object.entries(datos)) {
  console.log(`${coleccion}: ${docs.length}`);
}
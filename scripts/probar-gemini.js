// Prueba manual del servicio contra la API real de Gemini (consume cuota).
// Requiere GEMINI_API_KEY en el .env.
//
//   npm run probar:gemini
//   npm run probar:gemini -- "¿Qué pasa si cancelo una entrada?"
//
// Para probar otro modelo sin tocar el .env, en Git Bash:
//   GEMINI_MODEL=gemini-2.5-flash npm run probar:gemini
import "dotenv/config";
import { consultarIA, AsistenteError, MODELO_POR_DEFECTO } from "../services/aiService.js";

const pregunta = process.argv.slice(2).join(" ") || "¿Qué es Urbana Cult?";

console.log(`Modelo: ${process.env.GEMINI_MODEL || MODELO_POR_DEFECTO}`);
console.log(`Consulta: ${pregunta}\n`);

try {
  const respuesta = await consultarIA(pregunta);
  console.log(respuesta);
} catch (error) {
  // El detalle técnico ya se registró en el servidor; acá se resume el motivo.
  const motivo = error instanceof AsistenteError ? error.motivo : error.message;
  console.error(`\nLa consulta falló (${motivo}).`);
  process.exitCode = 1;
}
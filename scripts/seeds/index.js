import { generarUsuarios } from "./usuarios.js";
import { generarSalas } from "./salas.js";
import { generarEventos } from "./eventos.js";
import { generarEntradas } from "./entradas.js";

// Genera el conjunto completo de datos de prueba, sin conectarse a ninguna base.
// Las fechas se calculan respecto de `ahora`.
export const generarDatos = (ahora = new Date()) => {
  const usuarios = generarUsuarios();
  const salas = generarSalas();
  const eventos = generarEventos(usuarios, salas, ahora);
  const entradas = generarEntradas(usuarios, eventos, salas, ahora);

  return { usuarios, salas, eventos, entradas };
};
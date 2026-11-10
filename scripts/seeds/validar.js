import Usuario from "../../models/usuarioModel.js";
import Sala from "../../models/salaModel.js";
import { Evento } from "../../models/eventoModel.js";
import { Entrada, ESTADOS_ENTRADA } from "../../models/entradaModel.js";

const MODELOS = { usuarios: Usuario, salas: Sala, eventos: Evento, entradas: Entrada };

// Comprueba, sin conectarse a la base, que los datos pasan las validaciones de
// los esquemas y respetan las reglas de negocio que la base no controla sola.
export const validarDatos = async (datos) => {
  const errores = [];

  // 1. Cada documento contra su esquema de Mongoose.
  for (const [coleccion, Modelo] of Object.entries(MODELOS)) {
    for (const [i, doc] of datos[coleccion].entries()) {
      try {
        await new Modelo(doc).validate();
      } catch (error) {
        errores.push(`${coleccion}[${i}]: ${error.message}`);
      }
    }
  }

  // 2. Eventos de una misma sala no pueden superponerse.
  datos.eventos.forEach((a, i) => {
    datos.eventos.slice(i + 1).forEach((b) => {
      const mismaSala = a.salaId.equals(b.salaId);
      if (mismaSala && a.fechaInicio < b.fechaFin && a.fechaFin > b.fechaInicio) {
        errores.push(`Superposición en la misma sala: ${a.nombre} y ${b.nombre}`);
      }
    });
  });

  // 3. Nunca más entradas vendidas que la capacidad de la sala.
  for (const evento of datos.eventos) {
    const sala = datos.salas.find((s) => s._id.equals(evento.salaId));
    const vendidas = datos.entradas.filter(
      (e) => e.eventoId.equals(evento._id) && e.estado === ESTADOS_ENTRADA.VENDIDA,
    ).length;
    if (vendidas > sala.capacidad) {
      errores.push(`${evento.nombre}: ${vendidas} vendidas con capacidad ${sala.capacidad}`);
    }
  }

  if (errores.length > 0) {
    throw new Error(`Datos de prueba inválidos:\n${errores.join("\n")}`);
  }
};
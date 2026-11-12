import mongoose from "mongoose";
import { ESTADOS_ENTRADA } from "../../models/entradaModel.js";
import { ESTADOS_USUARIO } from "../../definitions/usuario.js";
import { CUPOS_LIBRES_EVENTO_ESPECIAL, ENTRADAS_POR_EVENTO_NORMAL } from "./config.js";
import { ESCENARIOS, escenarioDe } from "./eventos.js";
import { fechaDeVenta } from "./fechas.js";

const cantidadVendidas = (escenario, capacidad) => {
  if (escenario === ESCENARIOS.POCOS_CUPOS) return capacidad - CUPOS_LIBRES_EVENTO_ESPECIAL;
  if (escenario === ESCENARIOS.AGOTADO) return capacidad;
  return ENTRADAS_POR_EVENTO_NORMAL;
};

// `eventos` debe estar en el orden en que los generó generarEventos.
export const generarEntradas = (usuarios, eventos, salas, ahora = new Date()) => {
  const activos = usuarios.filter((u) => u.estado === ESTADOS_USUARIO.ACTIVO);
  const entradas = [];

  eventos.forEach((evento, i) => {
    const sala = salas.find((s) => s._id.equals(evento.salaId));
    if (!sala) throw new Error(`No se encontró la sala del evento ${evento.nombre}`);

    const vendidas = cantidadVendidas(escenarioDe(i), sala.capacidad);

    const crear = (estado, j, proporcion) => ({
      _id: new mongoose.Types.ObjectId(),
      eventoId: evento._id,
      usuarioId: activos[(i + j) % activos.length]._id,
      estado,
      fechaVenta: fechaDeVenta(evento, ahora, proporcion),
    });

    for (let j = 0; j < vendidas; j++) {
      entradas.push(crear(ESTADOS_ENTRADA.VENDIDA, j, 0.6));
    }
    // Una entrada cancelada por evento (no ocupa lugar).
    entradas.push(crear(ESTADOS_ENTRADA.CANCELADA, vendidas, 0.8));
  });

  return entradas;
};

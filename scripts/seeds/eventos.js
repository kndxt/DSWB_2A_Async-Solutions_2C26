import mongoose from "mongoose";
import { ESTADOS_EVENTO } from "../../models/eventoModel.js";
import { ESTADOS_USUARIO } from "../../definitions/usuario.js";
import { CANTIDAD_EVENTOS, HORA_BASE_EVENTOS, DURACION_EVENTO_HORAS } from "./config.js";
import { sumarDias, sumarHoras } from "./fechas.js";

export const ESCENARIOS = {
  FINALIZADO: "finalizado",
  VENTA_VENCIDA: "venta vencida",
  CANCELADO: "cancelado",
  POCOS_CUPOS: "pocos cupos",
  AGOTADO: "agotado",
  NORMAL: "normal",
};

const TIPOS = ["musica", "teatro", "danza", "cine", "taller"];

// Escenario de cada evento según su posición (0 a 19). Entradas usa la misma posición.
//  0-4 finalizados | 5-6 venta vencida | 7-9 cancelados
//  10 pocos cupos  | 11 agotado        | 12-19 normales
export const escenarioDe = (i) => {
  if (i <= 4) return ESCENARIOS.FINALIZADO;
  if (i <= 6) return ESCENARIOS.VENTA_VENCIDA;
  if (i <= 9) return ESCENARIOS.CANCELADO;
  if (i === 10) return ESCENARIOS.POCOS_CUPOS;
  if (i === 11) return ESCENARIOS.AGOTADO;
  return ESCENARIOS.NORMAL;
};

// Fecha de inicio del evento y período de venta de cada escenario.
const fechasDe = (escenario, i, base, ahora) => {
  switch (escenario) {
    case ESCENARIOS.FINALIZADO: {
      const inicio = sumarDias(base, -(20 + i * 3));
      return { inicio, inicioVenta: sumarDias(inicio, -15), finVenta: sumarDias(inicio, -1) };
    }
    case ESCENARIOS.VENTA_VENCIDA:
      // La venta terminó ayer, pero el evento todavía no comenzó.
      return {
        inicio: sumarDias(base, 7 + (i - 5) * 3),
        inicioVenta: sumarDias(ahora, -15),
        finVenta: sumarDias(ahora, -1),
      };
    case ESCENARIOS.CANCELADO: {
      const inicio = sumarDias(base, 15 + (i - 7) * 3);
      return { inicio, inicioVenta: sumarDias(ahora, -3), finVenta: sumarDias(inicio, -1) };
    }
    case ESCENARIOS.POCOS_CUPOS:
    case ESCENARIOS.AGOTADO: {
      // Comparten sala: las fechas están separadas para que no se superpongan.
      const inicio = sumarDias(base, escenario === ESCENARIOS.POCOS_CUPOS ? 25 : 28);
      return { inicio, inicioVenta: sumarDias(ahora, -3), finVenta: sumarDias(inicio, -1) };
    }
    default: {
      const inicio = sumarDias(base, 30 + (i - 12) * 3);
      return { inicio, inicioVenta: sumarDias(ahora, -3), finVenta: sumarDias(inicio, -1) };
    }
  }
};

const estadoDe = (escenario) => {
  if (escenario === ESCENARIOS.FINALIZADO) return ESTADOS_EVENTO.FINALIZADO;
  if (escenario === ESCENARIOS.CANCELADO) return ESTADOS_EVENTO.CANCELADO;
  return ESTADOS_EVENTO.ACTIVO;
};

export const generarEventos = (usuarios, salas, ahora = new Date()) => {
  const base = new Date(ahora);
  base.setHours(HORA_BASE_EVENTOS, 0, 0, 0);

  // Solo usuarios activos pueden reservar, igual que en la API.
  const activos = usuarios.filter((u) => u.estado === ESTADOS_USUARIO.ACTIVO);

  return Array.from({ length: CANTIDAD_EVENTOS }, (_, i) => {
    const escenario = escenarioDe(i);
    const { inicio, inicioVenta, finVenta } = fechasDe(escenario, i, base, ahora);

    // Los eventos de sala chica usan la sala 0; el resto, salas activas (1 a 14).
    const usaSalaChica = escenario === ESCENARIOS.POCOS_CUPOS || escenario === ESCENARIOS.AGOTADO;
    const sala = usaSalaChica ? salas[0] : salas[(i % 14) + 1];

    return {
      _id: new mongoose.Types.ObjectId(),
      salaId: sala._id,
      nombre: `Evento ${escenario} ${i + 1}`,
      descripcion: `Evento de prueba (${escenario}), número ${i + 1}.`,
      tipo: TIPOS[i % TIPOS.length],
      fechaInicio: inicio,
      fechaFin: sumarHoras(inicio, DURACION_EVENTO_HORAS),
      fechaInicioVenta: inicioVenta,
      fechaFinVenta: finVenta,
      precioEntrada: 5000 + i * 500,
      estado: estadoDe(escenario),
      // La reserva es un registro histórico: nunca queda en el futuro.
      reserva: {
        usuarioId: activos[i % activos.length]._id,
        fechaReserva: new Date(Math.min(sumarDias(inicio, -10), sumarDias(ahora, -1))),
        precioFinal: sala.precioReserva,
      },
    };
  });
};

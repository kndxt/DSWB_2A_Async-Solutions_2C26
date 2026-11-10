export const sumarDias = (fecha, dias) => {
  const resultado = new Date(fecha);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
};

export const sumarHoras = (fecha, horas) => {
  const resultado = new Date(fecha);
  resultado.setHours(resultado.getHours() + horas);
  return resultado;
};

// Fecha dentro del período de venta, sin pasar del momento actual:
// una entrada no puede figurar vendida en el futuro.
export const fechaDeVenta = (evento, ahora, proporcion = 0.6) => {
  const inicio = evento.fechaInicioVenta.getTime();
  const fin = Math.min(evento.fechaFinVenta.getTime(), ahora.getTime());
  return new Date(inicio + (fin - inicio) * proporcion);
};
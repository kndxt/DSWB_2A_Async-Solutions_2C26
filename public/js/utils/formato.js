// Funciones de formato compartidas por las vistas.

export const textoOGuion = (valor) =>
  valor === undefined || valor === null || valor === "" ? "—" : String(valor);

export const formatearPrecio = (valor) =>
  valor === undefined || valor === null
    ? "—"
    : `$ ${Number(valor).toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

// Fecha con hora en formato de 24 hs
export const formatearFechaHora = (iso) => {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
};

// Solo la fecha, como se muestra en Reservas.
export const formatearFecha = (valor) => {
  if (!valor) return "—";
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? "—" : fecha.toLocaleDateString("es-AR");
};

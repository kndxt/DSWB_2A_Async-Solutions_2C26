
/**
 * Construye una tabla HTML a partir de columnas y datos.
 *
 * Cada columna define:
 * - label: texto del encabezado.
 * - value: función que obtiene el valor de una fila.
 */

export function renderTable(table, columns, rows) {
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");

  if (!thead || !tbody) {
    throw new Error("La tabla debe tener thead y tbody.");
  }

  // Genera los encabezados.
  const filaEncabezados = document.createElement("tr");

  for (const columna of columns) {
    const th = document.createElement("th");
    th.textContent = columna.label;
    filaEncabezados.appendChild(th);
  }

  thead.replaceChildren(filaEncabezados);

  // Genera las filas de datos.
  const filas = rows.map((row) => {
    const tr = document.createElement("tr");

    for (const columna of columns) {
      const td = document.createElement("td");
      const valor = columna.value(row);

      td.textContent = valor ?? "";
      tr.appendChild(td);
    }

    return tr;
  });

  tbody.replaceChildren(...filas);
}

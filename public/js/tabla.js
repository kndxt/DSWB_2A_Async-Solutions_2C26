
/**
 * Construye una tabla HTML a partir de columnas y filas de datos.
 *
 * Cada columna define:
 * - label: texto del encabezado.
 * - value (opcional): función que devuelve el valor de texto de una celda.
 * - render (opcional): función que construye el contenido de una celda.
 *
 * Si una columna define value y render, tiene prioridad render.
 *
 * @param {HTMLTableElement} table - Tabla que se va a construir.
 * @param {Array} columns - Configuración de las columnas.
 * @param {Array} rows - Datos que se mostrarán.
 */
export function renderTable(table, columns, rows) {
  validarParametros(table, columns, rows);

  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");

  if (!thead || !tbody) {
    throw new Error("La tabla debe tener thead y tbody.");
  }

  thead.replaceChildren(crearEncabezados(columns));
  tbody.replaceChildren(...crearFilas(columns, rows));
}

/**
 * Comprueba los parámetros recibidos.
 */
function validarParametros(table, columns, rows) {
  if (!table || typeof table.querySelector !== "function") {
    throw new TypeError("Se debe proporcionar una tabla HTML válida.");
  }

  if (!Array.isArray(columns)) {
    throw new TypeError("Las columnas deben proporcionarse en un array.");
  }

  if (!Array.isArray(rows)) {
    throw new TypeError("Las filas deben proporcionarse en un array.");
  }
}

/**
 * Construye la fila de encabezados.
 */
function crearEncabezados(columns) {
  const fila = document.createElement("tr");

  for (const columna of columns) {
    const encabezado = document.createElement("th");
    encabezado.textContent = columna.label;
    fila.appendChild(encabezado);
  }

  return fila;
}

/**
 * Construye todas las filas de datos.
 */
function crearFilas(columns, rows) {
  return rows.map((row) => {
    const fila = document.createElement("tr");

    for (const columna of columns) {
      fila.appendChild(crearCelda(columna, row));
    }

    return fila;
  });
}

/**
 * Construye una celda según la configuración de su columna.
 */
function crearCelda(columna, row) {
  const celda = document.createElement("td");

  if (typeof columna.render === "function") {
    columna.render(celda, row);
  } else if (typeof columna.value === "function") {
    celda.textContent = columna.value(row) ?? "";
  }

  return celda;
}

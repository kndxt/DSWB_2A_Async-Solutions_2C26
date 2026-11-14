/**
 * Extrae la consulta dirigida a Gemini si la mención aparece
 * al comienzo del mensaje.
 *
 * @param {string} texto
 * @returns {string | null}
 */
export function extraerConsultaGemini(texto) {
  if (typeof texto !== "string") return null;

  const coincidencia = texto.match(/^@gemini\b\s+([\s\S]+)$/i);

  const consulta = coincidencia?.[1]?.trim();

  return consulta || null;
}

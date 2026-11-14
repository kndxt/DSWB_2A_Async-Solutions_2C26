// Un campo numérico vacío se envía como valorVacio (undefined en alta, null en edición),
// para que sea el backend quien responda con su mensaje de dato obligatorio o inválido.
export const leerNumero = (texto, valorVacio) => (texto.trim() === "" ? valorVacio : Number(texto));

// Crea un botón de acción para las tablas (se identifica con data-accion y data-id).
export const crearBoton = (texto, accion, id) => {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.textContent = texto;
  boton.dataset.accion = accion;
  boton.dataset.id = id;
  return boton;
};

// Agrega un párrafo "Etiqueta: valor" a un contenedor de detalle.
export const agregarDato = (contenedor, etiqueta, valor) => {
  const parrafo = document.createElement("p");
  const negrita = document.createElement("strong");
  negrita.textContent = `${etiqueta}: `;
  parrafo.append(negrita, valor);
  contenedor.append(parrafo);
};

// Ejecuta la función de inicio cuando el DOM está listo.
export const alCargarDOM = (iniciar) => {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
};

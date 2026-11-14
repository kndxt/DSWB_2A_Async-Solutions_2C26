// Mensajes de éxito y error compartidos por todas las vistas.
// Si no se indica un contenedor, se usa (o se crea) #mensajes al comienzo de <main>.

const obtenerContenedor = () => {
  let contenedor = document.getElementById("mensajes");
  if (!contenedor) {
    contenedor = document.createElement("div");
    contenedor.id = "mensajes";
    const principal = document.querySelector("main");
    if (principal) principal.prepend(contenedor);
    else document.body.prepend(contenedor);
  }
  return contenedor;
};

export const mostrarMensaje = (tipo, texto, contenedor) => {
  // Si no se indica un contenedor (o llega null), se usa #mensajes.
  const destino = contenedor ?? obtenerContenedor();
  const esExito = tipo === "exito";
  const aviso = document.createElement("p");
  aviso.className = `mensaje ${esExito ? "mensaje-exito" : "mensaje-error"}`;
  aviso.setAttribute("role", esExito ? "status" : "alert");
  aviso.textContent = texto;
  destino.replaceChildren(aviso);
};

export const limpiarMensajes = (contenedor = document.getElementById("mensajes")) => {
  if (contenedor) contenedor.replaceChildren();
};

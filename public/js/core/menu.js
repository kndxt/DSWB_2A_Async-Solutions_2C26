// Menú hamburguesa de la navegación principal (pantallas chicas).

const navbar = document.querySelector(".navbar");
const boton = document.getElementById("navbar-toggle");
const enlaces = document.getElementById("navbar-links");

if (navbar && boton && enlaces) {
  const pantallaChica = window.matchMedia("(max-width: 768px)");

  // Activa el comportamiento colapsable en el CSS.
  navbar.classList.add("navbar--js");

  const establecerAbierto = (abierto) => {
    navbar.classList.toggle("navbar--abierto", abierto);
    boton.setAttribute("aria-expanded", String(abierto));
    boton.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
  };

  boton.addEventListener("click", () => {
    establecerAbierto(boton.getAttribute("aria-expanded") !== "true");
  });

  // Al navegar con un enlace, el menú se cierra.
  enlaces.addEventListener("click", (evento) => {
    if (evento.target.closest("a")) establecerAbierto(false);
  });

  // Escape cierra el menú y devuelve el foco al botón.
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && boton.getAttribute("aria-expanded") === "true") {
      establecerAbierto(false);
      boton.focus();
    }
  });

  // Un clic fuera de la barra también lo cierra.
  document.addEventListener("click", (evento) => {
    if (!navbar.contains(evento.target)) establecerAbierto(false);
  });

  // Al pasar a pantalla ancha, se restablece el estado.
  pantallaChica.addEventListener("change", (evento) => {
    if (!evento.matches) establecerAbierto(false);
  });
}

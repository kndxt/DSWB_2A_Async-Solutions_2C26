// El rol del usuario actual lo publica el servidor en <body data-rol="...">.
// Sirve para mostrar u ocultar controles; el permiso real lo verifica el backend.
export const esAdmin = () => document.body.dataset.rol === "admin";


// Responde con 404 cuando la ruta solicitada no existe.
const notFound = (req, res) => {

  // Para diferenciar las vistas que requieren renderizado de las que no.
  const esVista = req.path === "/vistas" || req.path.startsWith("/vistas/");

  if (esVista) {
    return res.status(404).render("error", {
      mensaje: "La página solicitada no existe."
    });
  }

  res.status(404).json({
    message: 'Ruta no encontrada',
    path: req.originalUrl
  });


};

export default notFound;

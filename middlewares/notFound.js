
// Responde con 404 cuando la ruta solicitada no existe.
const notFound = (req, res) => {
  res.status(404).json({
    message: 'Ruta no encontrada',
    path: req.originalUrl
  });
};

export default notFound;

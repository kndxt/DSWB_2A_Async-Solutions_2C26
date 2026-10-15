
import mongoose from "mongoose";

const validarIds = (origen, ...campos) => {
  return (req, res, next) => {
    for (const campo of campos) {
      const id = req[origen][campo];

      if (!id) {
        return res.status(400).json({
          error: `El campo '${campo}' es obligatorio`,
        });
      }

      if (!mongoose.isObjectIdOrHexString(id)) {
        return res.status(400).json({
          error: `El identificador '${campo}' no tiene un formato válido`,
        });
      }
    }

    next();
  };
};

export default validarIds;

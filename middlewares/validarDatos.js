import mongoose from "mongoose";
import { ValidationError } from "../errors/errores.js";

/**
 * Comprueba si un valor tiene el formato esperado por la API.
 */
const validarTipo = (valor, tipo) => {
  switch (tipo) {
    case "objectId":
      return mongoose.isObjectIdOrHexString(valor);

    case "string":
      return typeof valor === "string";

    case "number":
      return typeof valor === "number" && Number.isFinite(valor);

    case "boolean":
      return typeof valor === "boolean";

    case "date":
      return (
        (typeof valor === "string" || valor instanceof Date) &&
        !Number.isNaN(new Date(valor).getTime())
      );

    default:
      throw new Error(`Tipo de dato no soportado: ${tipo}`);
  }
};

/**
 * Valida los datos recibidos según la definición de una entidad
 * y los requisitos de la operación correspondiente.
 */
const validarDatos = (definicion) => {
  return (operacion) => {
    return (req, res, next) => {
      for (const [origen, configuracion] of Object.entries(operacion)) {
        const datos = req[origen] ?? {};
        const { requeridos = [], opcionales = [] } = configuracion;

        const campos = [...requeridos, ...opcionales];

        // Comprueba que estén presentes los campos obligatorios.
        for (const campo of requeridos) {
          const valor = datos[campo];

          if (valor === undefined || valor === null || valor === "") {
            throw new ValidationError(`El campo '${campo}' es obligatorio`);
          }
        }

        // Valida únicamente los campos contemplados por la operación.
        for (const campo of campos) {
          const valor = datos[campo];

          // Los campos opcionales pueden omitirse.
          if (valor === undefined || valor === null || valor === "") {
            continue;
          }

          // El identificador de ruta no figura entre los atributos.
          const tipo = campo === "id" ? "objectId" : definicion.atributos[campo]?.tipo;

          if (!tipo) {
            throw new Error(`No se definió un tipo para el campo '${campo}'`);
          }

          if (!validarTipo(valor, tipo)) {
            throw new ValidationError(
              tipo === "objectId"
                ? `El identificador '${campo}' no tiene un formato válido`
                : `El campo '${campo}' no tiene un tipo de dato válido`,
            );
          }
        }
      }

      next();
    };
  };
};

export default validarDatos;

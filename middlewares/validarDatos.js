
import mongoose from "mongoose";
import { ValidationError } from "../errors/errores.js";

/**
 * Comprueba si un valor tiene el tipo de dato esperado.
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

    case "object":
      return (
        typeof valor === "object" &&
        valor !== null &&
        !Array.isArray(valor) &&
        !(valor instanceof Date)
      );

    default:
      throw new Error(`Tipo de dato no soportado: ${tipo}`);
  }
};

/**
 * Comprueba las restricciones declaradas para un atributo.
 */
const validarRestricciones = (valor, validaciones, nombreCampo) => {
  const { min, max, entero } = validaciones ?? {};

  if (entero && !Number.isInteger(valor)) {
    throw new ValidationError(
      `El campo '${nombreCampo}' debe ser un número entero`,
    );
  }

  if (min !== undefined && valor < min) {
    throw new ValidationError(
      `El campo '${nombreCampo}' debe ser mayor o igual a ${min}`,
    );
  }

  if (max !== undefined && valor > max) {
    throw new ValidationError(
      `El campo '${nombreCampo}' debe ser menor o igual a ${max}`,
    );
  }
};

/**
 * Comprueba la presencia, el tipo y las restricciones de un atributo.
 * Si es un objeto, también valida sus atributos internos.
 */
const validarAtributo = (valor, atributo, nombreCampo, requerido = false) => {
  if (valor === undefined || valor === null || valor === "") {
    if (requerido) {
      throw new ValidationError(`El campo '${nombreCampo}' es obligatorio`);
    }

    return;
  }

  if (!validarTipo(valor, atributo.tipo)) {
    throw new ValidationError(
      atributo.tipo === "objectId"
        ? `El identificador '${nombreCampo}' no tiene un formato válido`
        : `El campo '${nombreCampo}' no tiene un tipo de dato válido`,
    );
  }

  validarRestricciones(valor, atributo.validaciones, nombreCampo);

  if (atributo.tipo === "object") {
    for (const [nombre, definicion] of Object.entries(atributo.atributos)) {
      validarAtributo(
        valor[nombre],
        definicion,
        `${nombreCampo}.${nombre}`,
        requerido && definicion.requerido,
      );
    }
  }
};

/**
 * Valida los campos de un origen de la solicitud según la operación.
 */
const validarOrigen = (datos, configuracion, definicion) => {
  const { requeridos = [], opcionales = [] } = configuracion;

  for (const campo of [...requeridos, ...opcionales]) {
    const requerido = requeridos.includes(campo);

    // El identificador de ruta no forma parte de los atributos de la entidad.
    const atributo =
      campo === "id" ? { tipo: "objectId" } : definicion.atributos[campo];

    if (!atributo) {
      throw new Error(`No se definió un tipo para el campo '${campo}'`);
    }

    validarAtributo(datos[campo], atributo, campo, requerido);
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
        validarOrigen(req[origen] ?? {}, configuracion, definicion);
      }

      next();
    };
  };
};

export default validarDatos;

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
    throw new ValidationError(`El campo '${nombreCampo}' debe ser un número entero`);
  }

  if (min !== undefined && valor < min) {
    throw new ValidationError(`El campo '${nombreCampo}' debe ser mayor o igual a ${min}`);
  }

  if (max !== undefined && valor > max) {
    throw new ValidationError(`El campo '${nombreCampo}' debe ser menor o igual a ${max}`);
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
const validarOrigen = (datos, configuracion, definiciones) => {
  const { requeridos = [], opcionales = [] } = configuracion;

  for (const campo of [...requeridos, ...opcionales]) {
    const requerido = requeridos.includes(campo);
    const atributo = definiciones[campo];

    if (!atributo) {
      throw new Error(`No se definió un tipo para el campo '${campo}'`);
    }

    validarAtributo(datos[campo], atributo, campo, requerido);
  }
};

/**
 * Operadores de comparación disponibles.
 */
const operadores = {
  ">": (valor, referencia) => valor > referencia,
  ">=": (valor, referencia) => valor >= referencia,
  "<": (valor, referencia) => valor < referencia,
  "<=": (valor, referencia) => valor <= referencia,
  "===": (valor, referencia) => valor === referencia,
  "!==": (valor, referencia) => valor !== referencia,
};

/**
 * Define qué operadores pueden utilizarse según el tipo de dato.
 */
const operadoresPorTipo = {
  number: [">", ">=", "<", "<=", "===", "!=="],
  date: [">", ">=", "<", "<=", "===", "!=="],
  string: [">", ">=", "<", "<=", "===", "!=="],
  boolean: ["===", "!=="],
  objectId: ["===", "!=="],
};

/**
 * Normaliza los valores para poder compararlos según su tipo.
 */
const obtenerValorComparable = (valor, tipo) => {
  switch (tipo) {
    case "date":
      return new Date(valor).getTime();

    case "objectId":
      return valor.toString();

    default:
      return valor;
  }
};

/**
 * Comprueba las relaciones declaradas entre atributos.
 * Solo compara los atributos que están presentes en los datos recibidos.
 */
const validarRelaciones = (datos, relaciones, atributos) => {
  for (const { campo, operador, referencia } of relaciones ?? []) {
    const comparar = operadores[operador];

    if (!comparar) {
      throw new Error(`Operador de comparación no soportado: '${operador}'`);
    }

    const atributo = atributos[campo];
    const esReferenciaAhora = referencia === "ahora";
    const atributoReferencia = esReferenciaAhora ? atributo : atributos[referencia];

    if (!atributo || !atributoReferencia) {
      throw new Error(
        `No se definieron los atributos '${campo}' y '${referencia}' para su comparación`,
      );
    }

    if (atributo.tipo !== atributoReferencia.tipo) {
      throw new Error(
        `No se pueden comparar atributos de tipos diferentes: '${campo}' y '${referencia}'`,
      );
    }

    if (!operadoresPorTipo[atributo.tipo]?.includes(operador)) {
      throw new Error(
        `El operador '${operador}' no es válido para atributos de tipo '${atributo.tipo}'`,
      );
    }

    const valor = datos[campo];
    const valorReferencia = esReferenciaAhora ? obtenerInicioDelDia() : datos[referencia];

    // En actualizaciones parciales solo se comparan los campos recibidos.
    if (
      valor === undefined ||
      valor === null ||
      valor === "" ||
      valorReferencia === undefined ||
      valorReferencia === null ||
      valorReferencia === ""
    ) {
      continue;
    }

    const valorComparable = obtenerValorComparable(valor, atributo.tipo);
    const referenciaComparable = obtenerValorComparable(valorReferencia, atributoReferencia.tipo);

    if (!comparar(valorComparable, referenciaComparable)) {
      throw new ValidationError(
        `El campo '${campo}' debe ser ${obtenerDescripcionOperador(operador)} que '${referencia}'`,
      );
    }
  }
};

/**
 * Obtiene el inicio del día actual según la zona horaria del servidor.
 */
const obtenerInicioDelDia = () => {
  const ahora = new Date();
  ahora.setHours(0, 0, 0, 0);
  return ahora;
};

/**
 * Obtiene una descripción legible del operador para los mensajes de error.
 */
const obtenerDescripcionOperador = (operador) => {
  const descripciones = {
    ">": "mayor",
    ">=": "mayor o igual",
    "<": "menor",
    "<=": "menor o igual",
    "===": "igual",
    "!==": "distinto",
  };

  return descripciones[operador];
};

/**
 * Valida los datos recibidos según la definición de una entidad
 * y los requisitos de la operación correspondiente.
 */
const validarDatos = (definicion) => {
  return (operacion) => {
    return (req, res, next) => {
      for (const [origen, configuracion] of Object.entries(operacion)) {
        const definiciones = {
          ...(origen === "params" ? definicion.parametros : definicion.atributos),
          ...(configuracion.atributos ?? {}),
        };

        validarOrigen(req[origen] ?? {}, configuracion, definiciones ?? {});
      }

      if (operacion.body) {
        validarRelaciones(
          req.body ?? {},
          definicion.validaciones?.entreAtributos,
          definicion.atributos,
        );
      }

      next();
    };
  };
};

export default validarDatos;

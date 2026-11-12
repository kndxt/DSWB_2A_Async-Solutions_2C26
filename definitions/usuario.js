/**
 * Define la estructura de Usuario y los datos que recibe cada operación.
 * Es una fuente compartida por middlewares, modelos y otras capas.
 */

export const usuarioDefinicion = {
  // Atributos que componen un documento de Usuario.
  atributos: {
    nombre: {
      tipo: "string",
      requerido: true,
    },
    apellido: {
      tipo: "string",
      requerido: true,
    },
    email: {
      tipo: "email",
      requerido: true,
    },
    telefono: {
      tipo: "string",
    },
    password: {
      tipo: "string",
      requerido: true,
      validaciones: {
        noVacio: true,
      },
    },
    estado: {
      tipo: "string",
      valores: {
        ACTIVO: "activo",
        INACTIVO: "inactivo",
      },
      default: "activo",
    },
    rol: {
      tipo: "string",
      valores: {
        ADMIN: "admin",
        CLIENTE: "cliente",
      },
      default: "cliente",
    },
  },

  // Parámetros utilizados por las operaciones de Usuario.
  parametros: {
    id: {
      tipo: "objectId",
    },
  },

  // Datos que cada operación recibe del cliente.
  // Los datos derivados de la sesión autenticada se obtienen en el controlador.
  operaciones: {
    obtenerTodos: {},

    obtenerPorId: {
      params: {
        requeridos: ["id"],
        opcionales: [],
      },
    },

    crear: {
      body: {
        requeridos: ["nombre", "apellido", "email", "password"],
        opcionales: ["telefono"],
      },
    },

    login: {
      body: {
        requeridos: ["email", "password"],
        opcionales: [],
      },
    },

    actualizar: {
      params: {
        requeridos: ["id"],
        opcionales: [],
      },
      body: {
        requeridos: [],
        opcionales: ["nombre", "apellido", "email", "telefono", "password"],
      },
    },

    cambiarRol: {
      params: {
        requeridos: ["id"],
        opcionales: [],
      },
      body: {
        requeridos: ["rol"],
        opcionales: [],
      },
    },
    cambiarEstado: {
      params: {
        requeridos: ["id"],
        opcionales: [],
      },
      body: {
        requeridos: ["estado"],
        opcionales: [],
      },
    },
  },
};

export const ROLES_USUARIO = usuarioDefinicion.atributos.rol.valores;
export const ROLES_VALIDOS = Object.values(ROLES_USUARIO);

export const ESTADOS_USUARIO = usuarioDefinicion.atributos.estado.valores;
export const ESTADOS_VALIDOS = Object.values(ESTADOS_USUARIO);

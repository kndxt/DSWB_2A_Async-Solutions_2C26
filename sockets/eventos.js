// Contrato de eventos y límites del chat, compartido,

export const EVENTOS = {
  MENSAJE: "chat:mensaje",
  ERROR: "chat:error",
  SESION_EXPIRADA: "chat:sesion-expirada",
};

export const TIPOS = {
  USUARIO: "usuario",
  ASISTENTE: "asistente",
  SISTEMA: "sistema",
};

export const LIMITE_TEXTO = 500;

export const AUTOR_ASISTENTE = { id: null, nombre: "Gemini" };
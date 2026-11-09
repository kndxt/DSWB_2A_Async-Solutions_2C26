export const NOMBRE_COOKIE = "token";

export const opcionesCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 60 * 60 * 1000, // 1 hora
};

export function setearCookieToken(res, token) {
  res.cookie(NOMBRE_COOKIE, token, opcionesCookie);
}

export function limpiarCookieToken(res) {
  res.clearCookie(NOMBRE_COOKIE);
}

export function leerCookieToken(req) {
  return req.cookies?.[NOMBRE_COOKIE] || null;
}
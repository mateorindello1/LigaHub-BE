import type { CookieOptions, Request, Response } from 'express';
import type { SameSite } from '../../config/configuracion.js';

/** Nombre de la cookie con el token de refresco. */
export const NOMBRE_COOKIE_REFRESCO = 'ligahub_refresco';

/**
 * Opciones de la cookie del token de refresco:
 * - httpOnly: el JavaScript de la página no la puede leer. Un ataque XSS no puede robarla.
 * - secure: solo viaja por HTTPS (los navegadores aceptan http://localhost como seguro).
 * - path /auth: el navegador la envía solo a los endpoints de autenticación, no en cada pedido.
 * - sameSite: el navegador no la envía en pedidos que salen de otros sitios (protección CSRF).
 */
function opciones(sameSite: SameSite): CookieOptions {
  return { httpOnly: true, secure: true, sameSite, path: '/auth' };
}

/** Escribe la cookie con el token de refresco. Vence junto con la sesión. */
export function escribirCookieRefresco(
  respuesta: Response,
  token: string,
  vencimiento: Date,
  sameSite: SameSite,
): void {
  respuesta.cookie(NOMBRE_COOKIE_REFRESCO, token, {
    ...opciones(sameSite),
    expires: vencimiento,
  });
}

/** Borra la cookie del token de refresco (cierre de sesión o token inválido). */
export function borrarCookieRefresco(
  respuesta: Response,
  sameSite: SameSite,
): void {
  respuesta.clearCookie(NOMBRE_COOKIE_REFRESCO, opciones(sameSite));
}

/** Lee el token de refresco de la cookie del pedido (la interpreta cookie-parser). */
export function leerCookieRefresco(pedido: Request): string | undefined {
  const cookies = pedido.cookies as Record<string, string> | undefined;
  return cookies?.[NOMBRE_COOKIE_REFRESCO];
}

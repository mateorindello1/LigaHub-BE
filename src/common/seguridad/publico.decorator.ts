import { SetMetadata } from '@nestjs/common';

export const CLAVE_PUBLICO = 'esPublico';

/**
 * Marca un endpoint como accesible sin iniciar sesión.
 * Equivale a [AllowAnonymous] de ASP.NET Core.
 *
 * Todos los demás endpoints exigen un token: los guards de autenticación y de roles son globales.
 */
export const Publico = () => SetMetadata(CLAVE_PUBLICO, true);

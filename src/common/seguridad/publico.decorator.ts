import { SetMetadata } from '@nestjs/common';

export const CLAVE_PUBLICO = 'esPublico';

/**
 * Marca un endpoint como accesible sin iniciar sesión.
 * Equivale a [AllowAnonymous] de ASP.NET Core.
 *
 * Por ahora solo documenta el permiso: tiene efecto cuando se active el guard
 * de autenticación (etapa 9).
 */
export const Publico = () => SetMetadata(CLAVE_PUBLICO, true);

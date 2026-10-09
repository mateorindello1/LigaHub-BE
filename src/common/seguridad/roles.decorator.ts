import { SetMetadata } from '@nestjs/common';
import { Rol } from './rol.enum.js';

export const CLAVE_ROLES = 'roles';

/**
 * Indica qué roles pueden usar un endpoint.
 * Equivale a [Authorize(Roles = "...")] de ASP.NET Core.
 *
 * Por ahora solo documenta el permiso: tiene efecto cuando se active el guard
 * de roles (etapa 9).
 */
export const Roles = (...roles: Rol[]) => SetMetadata(CLAVE_ROLES, roles);

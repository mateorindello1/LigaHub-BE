import { applyDecorators, SetMetadata } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Rol } from './rol.enum.js';

export const CLAVE_ROLES = 'roles';

/**
 * Indica qué roles pueden usar un endpoint (alcanza con tener uno).
 * Equivale a [Authorize(Roles = "...")] de ASP.NET Core. Lo controla el RolesGuard.
 *
 * Además lo documenta en Swagger: el endpoint aparece con candado (requiere token) y con las
 * respuestas 401 y 403.
 */
export const Roles = (...roles: Rol[]) =>
  applyDecorators(
    SetMetadata(CLAVE_ROLES, roles),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({
      description: 'No inició sesión o la sesión venció.',
    }),
    ApiForbiddenResponse({
      description: `Requiere el rol ${roles.map((rol) => Rol[rol]).join(' o ')}.`,
    }),
  );

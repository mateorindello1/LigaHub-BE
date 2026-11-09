import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CLAVE_PUBLICO } from '../../common/seguridad/publico.decorator.js';
import type { Rol } from '../../common/seguridad/rol.enum.js';
import { CLAVE_ROLES } from '../../common/seguridad/roles.decorator.js';
import type { PedidoAutenticado } from './contenido-token.js';

/** Mensaje del 403: el usuario inició sesión, pero su rol no alcanza para la acción. */
export const MENSAJE_SIN_PERMISO =
  'No tenés permiso para realizar esta acción.';

/**
 * Compara los roles del usuario de la sesión con los que pide @Roles(...) en el endpoint.
 * Basta con tener uno de ellos. Equivale a [Authorize(Roles = "...")] de ASP.NET Core.
 *
 * Corre después del guard de autenticación, que ya dejó el usuario en el pedido.
 * - Endpoint con @Publico(): no se controla nada.
 * - Endpoint sin @Roles(...): alcanza con haber iniciado sesión (por ejemplo, GET /auth/yo).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const destinos = [contexto.getHandler(), contexto.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(CLAVE_PUBLICO, destinos)) {
      return true;
    }

    const rolesPermitidos = this.reflector.getAllAndOverride<Rol[]>(
      CLAVE_ROLES,
      destinos,
    );
    if (!rolesPermitidos?.length) {
      return true;
    }

    const { usuario } = contexto.switchToHttp().getRequest<PedidoAutenticado>();
    const tienePermiso = usuario?.roles.some((rol) =>
      rolesPermitidos.includes(rol),
    );
    if (!tienePermiso) {
      throw new ForbiddenException(MENSAJE_SIN_PERMISO);
    }
    return true;
  }
}

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { ContenidoToken, PedidoAutenticado } from './contenido-token.js';

/**
 * Inyecta en un parámetro del controller el usuario de la sesión (el contenido del token).
 * Equivale a leer User (ClaimsPrincipal) en un controller de ASP.NET Core.
 *
 * Solo tiene valor en endpoints protegidos: el guard de autenticación es el que lo carga.
 */
export const UsuarioActual = createParamDecorator(
  (_dato: unknown, contexto: ExecutionContext): ContenidoToken | undefined =>
    contexto.switchToHttp().getRequest<PedidoAutenticado>().usuario,
);

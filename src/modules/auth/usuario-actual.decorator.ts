import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { PedidoAutenticado, UsuarioDeSesion } from './contenido-token.js';

/**
 * Inyecta en un parámetro del controller el usuario de la sesión (id, email, roles y jugador).
 * Equivale a leer User (ClaimsPrincipal) en un controller de ASP.NET Core.
 *
 * Solo tiene valor en endpoints protegidos: el guard de autenticación es el que lo carga.
 */
export const UsuarioActual = createParamDecorator(
  (_dato: unknown, contexto: ExecutionContext): UsuarioDeSesion | undefined =>
    contexto.switchToHttp().getRequest<PedidoAutenticado>().usuario,
);

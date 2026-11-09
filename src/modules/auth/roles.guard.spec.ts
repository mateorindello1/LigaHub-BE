import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { CLAVE_PUBLICO } from '../../common/seguridad/publico.decorator.js';
import { Rol } from '../../common/seguridad/rol.enum.js';
import { CLAVE_ROLES } from '../../common/seguridad/roles.decorator.js';
import type { ContenidoToken } from './contenido-token.js';
import { MENSAJE_SIN_PERMISO, RolesGuard } from './roles.guard.js';

/**
 * Arma el guard y el contexto de un pedido: los metadatos del endpoint (@Publico, @Roles)
 * y el usuario que dejó el guard de autenticación.
 */
function preparar(
  metadatos: { [CLAVE_PUBLICO]?: boolean; [CLAVE_ROLES]?: Rol[] },
  usuario?: ContenidoToken,
) {
  const reflector = {
    getAllAndOverride: (clave: string) =>
      metadatos[clave as keyof typeof metadatos],
  } as unknown as Reflector;
  const contexto = {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ usuario }) }),
  } as unknown as ExecutionContext;
  return { guard: new RolesGuard(reflector), contexto };
}

/** Usuario de la sesión con los roles indicados. */
const usuarioCon = (...roles: Rol[]): ContenidoToken => ({
  sub: 1,
  email: 'prueba@ligahub.test',
  roles,
});

describe('RolesGuard', () => {
  it('deja pasar un endpoint público sin usuario', () => {
    // Arrange
    const { guard, contexto } = preparar({ [CLAVE_PUBLICO]: true });

    // Act y Assert
    expect(guard.canActivate(contexto)).toBe(true);
  });

  it('deja pasar un endpoint sin @Roles a cualquier usuario con sesión', () => {
    // Arrange
    const { guard, contexto } = preparar({}, usuarioCon(Rol.Jugador));

    // Act y Assert
    expect(guard.canActivate(contexto)).toBe(true);
  });

  it.each([
    ['tiene el rol pedido', [Rol.Administrador], [Rol.Administrador]],
    [
      'tiene uno de los roles pedidos',
      [Rol.Asistente, Rol.Administrador],
      [Rol.Asistente],
    ],
    [
      'tiene varios roles y uno alcanza',
      [Rol.Administrador],
      [Rol.Jugador, Rol.Administrador],
    ],
  ])('deja pasar si el usuario %s', (_caso, pedidos, delUsuario) => {
    // Arrange
    const { guard, contexto } = preparar(
      { [CLAVE_ROLES]: pedidos },
      usuarioCon(...delUsuario),
    );

    // Act y Assert
    expect(guard.canActivate(contexto)).toBe(true);
  });

  it('responde 403 si el usuario no tiene ninguno de los roles pedidos', () => {
    // Arrange
    const { guard, contexto } = preparar(
      { [CLAVE_ROLES]: [Rol.Administrador] },
      usuarioCon(Rol.Asistente, Rol.Jugador),
    );

    // Act y Assert
    expect(() => guard.canActivate(contexto)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(contexto)).toThrow(MENSAJE_SIN_PERMISO);
  });

  it('responde 403 si el endpoint pide roles y no hay usuario', () => {
    // Arrange
    const { guard, contexto } = preparar({
      [CLAVE_ROLES]: [Rol.Administrador],
    });

    // Act y Assert
    expect(() => guard.canActivate(contexto)).toThrow(ForbiddenException);
  });
});

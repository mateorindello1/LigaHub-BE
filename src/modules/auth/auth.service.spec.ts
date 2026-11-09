import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { beforeAll, describe, expect, it } from 'vitest';
import { Rol } from '../../common/seguridad/rol.enum.js';
import { ContraseniasService } from '../usuarios/contrasenias.service.js';
import type { UsuarioConCredenciales } from '../usuarios/usuario.js';
import type { UsuariosRepository } from '../usuarios/usuarios.repository.js';
import { AuthService, MENSAJE_CREDENCIALES_INVALIDAS } from './auth.service.js';
import type { ContenidoToken } from './contenido-token.js';

/** Repositorio falso en memoria con un solo usuario. */
function crearRepositorio(usuario: UsuarioConCredenciales) {
  return {
    buscarConCredenciales: (email: string) =>
      Promise.resolve(
        email.trim().toLowerCase() === usuario.email ? usuario : null,
      ),
    obtenerPorId: (id: number) => {
      if (id !== usuario.id) return Promise.resolve(null);
      const { contraseniaHash: _hash, ...sinHash } = usuario;
      return Promise.resolve(sinHash);
    },
  } as unknown as UsuariosRepository;
}

describe('AuthService', () => {
  const contrasenias = new ContraseniasService();
  const jwt = new JwtService({
    secret: 'secreto-de-prueba-de-al-menos-32-caracteres',
    signOptions: { expiresIn: '8h' },
  });
  let servicio: AuthService;

  beforeAll(async () => {
    // Arrange: un administrador con contraseña conocida.
    const usuario: UsuarioConCredenciales = {
      id: 1,
      email: 'admin@ligahub.test',
      fotoPerfilURL: null,
      jugadorId: null,
      roles: [Rol.Administrador],
      contraseniaHash: await contrasenias.generarHash('contraseña-correcta'),
    };
    servicio = new AuthService(crearRepositorio(usuario), contrasenias, jwt);
  });

  it('con credenciales correctas devuelve un token firmado con el id, el email y los roles', async () => {
    // Act
    const respuesta = await servicio.iniciarSesion(
      'admin@ligahub.test',
      'contraseña-correcta',
    );

    // Assert
    const contenido = await jwt.verifyAsync<ContenidoToken>(respuesta.token);
    expect(contenido).toMatchObject({
      sub: 1,
      email: 'admin@ligahub.test',
      roles: [Rol.Administrador],
    });
    expect(respuesta.usuario).not.toHaveProperty('contraseniaHash');
  });

  it('informa cuándo vence el token (8 horas)', async () => {
    // Act
    const antes = Date.now();
    const { expira } = await servicio.iniciarSesion(
      'admin@ligahub.test',
      'contraseña-correcta',
    );

    // Assert: 8 horas, con un margen de unos segundos.
    const duracion = new Date(expira).getTime() - antes;
    expect(duracion).toBeGreaterThan(8 * 3600_000 - 5_000);
    expect(duracion).toBeLessThanOrEqual(8 * 3600_000 + 1_000);
  });

  it.each([
    ['la contraseña es incorrecta', 'admin@ligahub.test', 'otra'],
    ['el email no existe', 'nadie@ligahub.test', 'contraseña-correcta'],
  ])(
    'si %s responde 401 con el mismo mensaje genérico',
    async (_caso, email, contrasenia) => {
      // Act y Assert
      const intento = servicio.iniciarSesion(email, contrasenia);
      await expect(intento).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(intento).rejects.toThrow(MENSAJE_CREDENCIALES_INVALIDAS);
    },
  );

  it('obtiene el usuario de la sesión sin el hash', async () => {
    // Act
    const usuario = await servicio.obtenerUsuarioActual(1);

    // Assert
    expect(usuario.email).toBe('admin@ligahub.test');
    expect(usuario).not.toHaveProperty('contraseniaHash');
  });

  it('responde 401 si el usuario de la sesión ya no existe', async () => {
    // Act y Assert
    await expect(servicio.obtenerUsuarioActual(99)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Rol } from '../../common/seguridad/rol.enum.js';
import { ContraseniasService } from '../usuarios/contrasenias.service.js';
import type { UsuarioConCredenciales } from '../usuarios/usuario.js';
import type { UsuariosRepository } from '../usuarios/usuarios.repository.js';
import {
  AuthService,
  MENSAJE_CREDENCIALES_INVALIDAS,
  MENSAJE_SESION_INVALIDA,
} from './auth.service.js';
import type { ContenidoToken } from './contenido-token.js';
import type {
  NuevoTokenRefresco,
  TokenRefrescoGuardado,
  TokensRefrescoRepository,
} from './tokens-refresco.repository.js';

/** Repositorio falso en memoria con un solo usuario. */
function crearRepositorioUsuarios(usuario: UsuarioConCredenciales) {
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

type FilaToken = TokenRefrescoGuardado & { tokenHash: string };

/** Repositorio falso en memoria de tokens de refresco, con las filas a la vista. */
function crearRepositorioTokens() {
  const filas: FilaToken[] = [];
  let siguienteId = 1;
  const agregar = (nuevo: NuevoTokenRefresco) =>
    filas.push({
      ...nuevo,
      id: String(siguienteId++),
      fechaHoraRevocacion: null,
    });

  const repositorio = {
    buscarPorHash: (tokenHash: string) =>
      Promise.resolve(
        filas.find((fila) => fila.tokenHash === tokenHash) ?? null,
      ),
    crear: (nuevo: NuevoTokenRefresco) => {
      agregar(nuevo);
      return Promise.resolve();
    },
    rotar: (idAnterior: string, nuevo: NuevoTokenRefresco) => {
      const anterior = filas.find((fila) => fila.id === idAnterior);
      if (!anterior || anterior.fechaHoraRevocacion) {
        return Promise.resolve(false);
      }
      anterior.fechaHoraRevocacion = new Date();
      agregar(nuevo);
      return Promise.resolve(true);
    },
    revocarFamilia: (familiaId: string) => {
      for (const fila of filas) {
        if (fila.familiaId === familiaId) {
          fila.fechaHoraRevocacion ??= new Date();
        }
      }
      return Promise.resolve();
    },
    borrarVencidos: () => Promise.resolve(),
  } as unknown as TokensRefrescoRepository;

  return { repositorio, filas };
}

const SIETE_DIAS = 7 * 86_400_000;

describe('AuthService', () => {
  const contrasenias = new ContraseniasService();
  const jwt = new JwtService({
    secret: 'secreto-de-prueba-de-al-menos-32-caracteres',
    signOptions: { expiresIn: '15m' },
  });
  let usuario: UsuarioConCredenciales;
  let tokens: ReturnType<typeof crearRepositorioTokens>;
  let servicio: AuthService;

  beforeAll(async () => {
    // Arrange: un administrador con contraseña conocida.
    usuario = {
      id: 1,
      email: 'admin@ligahub.test',
      fotoPerfilURL: null,
      jugador: null,
      jugadorId: null,
      roles: [Rol.Administrador],
      contraseniaHash: await contrasenias.generarHash('contraseña-correcta'),
    };
  });

  beforeEach(() => {
    // Arrange: tabla de tokens vacía en cada test.
    tokens = crearRepositorioTokens();
    servicio = new AuthService(
      crearRepositorioUsuarios(usuario),
      tokens.repositorio,
      contrasenias,
      jwt,
      { duracionRefresco: SIETE_DIAS, sameSite: 'strict' },
    );
  });

  /** Inicia sesión con las credenciales correctas. */
  const iniciar = () =>
    servicio.iniciarSesion('admin@ligahub.test', 'contraseña-correcta');

  describe('iniciarSesion', () => {
    it('con credenciales correctas devuelve un token de acceso firmado con el id, el email y los roles', async () => {
      // Act
      const { respuesta } = await iniciar();

      // Assert
      const contenido = await jwt.verifyAsync<ContenidoToken>(respuesta.token);
      expect(contenido).toMatchObject({
        sub: 1,
        email: 'admin@ligahub.test',
        roles: [Rol.Administrador],
      });
      expect(respuesta.usuario).not.toHaveProperty('contraseniaHash');
    });

    it('informa cuándo vence el token de acceso (15 minutos)', async () => {
      // Act
      const antes = Date.now();
      const { respuesta } = await iniciar();

      // Assert: 15 minutos, con un margen de unos segundos.
      const duracion = new Date(respuesta.expira).getTime() - antes;
      expect(duracion).toBeGreaterThan(15 * 60_000 - 5_000);
      expect(duracion).toBeLessThanOrEqual(15 * 60_000 + 1_000);
    });

    it('emite un token de refresco que vence en 7 días y guarda solo su hash', async () => {
      // Act
      const antes = Date.now();
      const { refresco } = await iniciar();

      // Assert
      expect(refresco.token).toMatch(/^[\w-]{43}$/);
      expect(refresco.vencimiento.getTime() - antes).toBeGreaterThanOrEqual(
        SIETE_DIAS,
      );
      expect(tokens.filas).toHaveLength(1);
      expect(tokens.filas[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(tokens.filas[0].tokenHash).not.toBe(refresco.token);
    });

    it.each([
      ['la contraseña es incorrecta', 'admin@ligahub.test', 'otra'],
      ['el email no existe', 'nadie@ligahub.test', 'contraseña-correcta'],
    ])(
      'si %s responde 401 con el mismo mensaje genérico y no crea sesión',
      async (_caso, email, contrasenia) => {
        // Act y Assert
        const intento = servicio.iniciarSesion(email, contrasenia);
        await expect(intento).rejects.toBeInstanceOf(UnauthorizedException);
        await expect(intento).rejects.toThrow(MENSAJE_CREDENCIALES_INVALIDAS);
        expect(tokens.filas).toHaveLength(0);
      },
    );
  });

  describe('refrescarSesion', () => {
    it('entrega un token de acceso nuevo y reemplaza el de refresco, con el mismo vencimiento', async () => {
      // Arrange
      const login = await iniciar();

      // Act
      const refresco = await servicio.refrescarSesion(login.refresco.token);

      // Assert
      await expect(
        jwt.verifyAsync<ContenidoToken>(refresco.respuesta.token),
      ).resolves.toMatchObject({ sub: 1 });
      expect(refresco.refresco.token).not.toBe(login.refresco.token);
      expect(refresco.refresco.vencimiento).toEqual(login.refresco.vencimiento);
      expect(tokens.filas[0].fechaHoraRevocacion).not.toBeNull();
      expect(tokens.filas[1].fechaHoraRevocacion).toBeNull();
      expect(tokens.filas[1].familiaId).toBe(tokens.filas[0].familiaId);
    });

    it('si se reutiliza un token ya usado responde 401 y revoca toda la sesión', async () => {
      // Arrange: se refresca una vez, así que el token del login ya está usado.
      const login = await iniciar();
      const vigente = await servicio.refrescarSesion(login.refresco.token);

      // Act: alguien presenta el token viejo (por ejemplo, una copia robada).
      const reutilizado = servicio.refrescarSesion(login.refresco.token);

      // Assert: se rechaza, y el token vigente también deja de servir.
      await expect(reutilizado).rejects.toThrow(MENSAJE_SESION_INVALIDA);
      await expect(
        servicio.refrescarSesion(vigente.refresco.token),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it.each([
      ['falta', undefined],
      ['no existe', 'token-inventado'],
    ])('si el token %s responde 401', async (_caso, token) => {
      // Act y Assert
      await expect(servicio.refrescarSesion(token)).rejects.toThrow(
        MENSAJE_SESION_INVALIDA,
      );
    });

    it('si la sesión venció responde 401', async () => {
      // Arrange: el token guardado venció hace un segundo.
      const login = await iniciar();
      tokens.filas[0].fechaHoraVencimiento = new Date(Date.now() - 1_000);

      // Act y Assert
      await expect(
        servicio.refrescarSesion(login.refresco.token),
      ).rejects.toThrow(MENSAJE_SESION_INVALIDA);
    });
  });

  describe('cerrarSesion', () => {
    it('revoca el token de refresco: después no se puede refrescar', async () => {
      // Arrange
      const login = await iniciar();

      // Act
      await servicio.cerrarSesion(login.refresco.token);

      // Assert
      await expect(
        servicio.refrescarSesion(login.refresco.token),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('sin token o con uno inexistente no falla', async () => {
      // Act y Assert
      await expect(servicio.cerrarSesion(undefined)).resolves.toBeUndefined();
      await expect(servicio.cerrarSesion('otro')).resolves.toBeUndefined();
    });
  });

  describe('obtenerUsuarioActual', () => {
    it('obtiene el usuario de la sesión sin el hash', async () => {
      // Act
      const actual = await servicio.obtenerUsuarioActual(1);

      // Assert
      expect(actual.email).toBe('admin@ligahub.test');
      expect(actual).not.toHaveProperty('contraseniaHash');
    });

    it('responde 401 si el usuario de la sesión ya no existe', async () => {
      // Act y Assert
      await expect(servicio.obtenerUsuarioActual(99)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});

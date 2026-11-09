import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './../src/app.module.js';

/**
 * Test de integración de los permisos: la API completa contra la base del .env (con el seed
 * cargado), usada por HTTP con cada rol. Verifica que los guards globales de autenticación y de
 * roles respeten @Publico() y @Roles(...) en endpoints reales.
 */
describe('Permisos por rol (e2e)', () => {
  let app: INestApplication<App>;
  /** Token de cada usuario de prueba del seed. */
  const tokens: Record<'administrador' | 'asistente' | 'jugador', string> = {
    administrador: '',
    asistente: '',
    jugador: '',
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = modulo.createNestApplication();
    await app.init();

    // Un login por usuario (3 de los 5 intentos por minuto permitidos).
    for (const usuario of Object.keys(tokens) as (keyof typeof tokens)[]) {
      const respuesta = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: `${usuario}@ligahub.test`,
          contrasenia: process.env.SEED_CONTRASENIA,
        });
      tokens[usuario] = respuesta.body.token;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  /** Pedido HTTP, opcionalmente con el token de un usuario. */
  const pedido = (
    metodo: 'get' | 'post' | 'patch' | 'delete',
    ruta: string,
    usuario?: keyof typeof tokens,
  ) => {
    const req = request(app.getHttpServer())[metodo](ruta);
    return usuario
      ? req.set('Authorization', `Bearer ${tokens[usuario]}`)
      : req;
  };

  it('los endpoints públicos responden sin sesión', async () => {
    // Act
    const respuestas = await Promise.all([
      pedido('get', '/torneos'),
      pedido('get', '/equipos'),
      pedido('get', '/torneos/1/posiciones'),
      pedido('get', '/torneos/1/fixture'),
    ]);

    // Assert
    for (const respuesta of respuestas) {
      expect(respuesta.status).toBe(200);
    }
  });

  it('un endpoint protegido responde 401 sin sesión', async () => {
    // Act
    const respuesta = await pedido('post', '/torneos').send({
      nombre: 'No se crea',
      anio: 2026,
    });

    // Assert
    expect(respuesta.status).toBe(401);
    expect(respuesta.body.mensaje).toBe('Tenés que iniciar sesión.');
  });

  it.each(['asistente', 'jugador'] as const)(
    'un endpoint de Administrador responde 403 al %s',
    async (usuario) => {
      // Act: crear un torneo, borrar un equipo y generar un fixture (ninguno llega a ejecutarse).
      const respuestas = [
        await pedido('post', '/torneos', usuario).send({
          nombre: 'No',
          anio: 2026,
        }),
        await pedido('delete', '/equipos/1', usuario),
        await pedido('post', '/torneos/2/fixture', usuario).send({}),
      ];

      // Assert
      for (const respuesta of respuestas) {
        expect(respuesta.status).toBe(403);
        expect(respuesta.body.mensaje).toBe(
          'No tenés permiso para realizar esta acción.',
        );
      }
    },
  );

  it('el Administrador puede crear y borrar un torneo', async () => {
    // Act
    const creado = await pedido('post', '/torneos', 'administrador').send({
      nombre: `Torneo de prueba ${Date.now()}`,
      anio: 2026,
    });
    const borrado = await pedido(
      'delete',
      `/torneos/${creado.body.id}`,
      'administrador',
    );

    // Assert
    expect(creado.status).toBe(201);
    expect(borrado.status).toBe(204);
  });

  it('GET /auth/yo responde a cualquier rol con sesión', async () => {
    // Act
    const respuestas = await Promise.all(
      (Object.keys(tokens) as (keyof typeof tokens)[]).map((usuario) =>
        pedido('get', '/auth/yo', usuario),
      ),
    );

    // Assert
    expect(respuestas.map((respuesta) => respuesta.status)).toEqual([
      200, 200, 200,
    ]);
  });
});

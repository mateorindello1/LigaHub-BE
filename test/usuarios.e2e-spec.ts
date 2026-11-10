import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './../src/app.module.js';

/**
 * Test de integración de la gestión de usuarios (S-6): la API completa contra la base del .env,
 * con los usuarios del seed. Crea un usuario de prueba, lo usa y lo borra al final.
 *
 * Usa 5 logins, el máximo por minuto que permite el límite de intentos.
 */
describe('Gestión de usuarios (e2e)', () => {
  let app: INestApplication<App>;
  let tokenAdmin = '';
  let tokenJugador = '';
  const emailPrueba = `prueba-${Date.now()}@ligahub.test`;

  const servidor = () => app.getHttpServer();
  const login = (email: string, contrasenia: string | undefined) =>
    request(servidor()).post('/auth/login').send({ email, contrasenia });
  const conToken = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = modulo.createNestApplication();
    await app.init();

    tokenAdmin = (
      await login('administrador@ligahub.test', process.env.SEED_CONTRASENIA)
    ).body.token;
    tokenJugador = (
      await login('jugador@ligahub.test', process.env.SEED_CONTRASENIA)
    ).body.token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('solo el Administrador lista usuarios y jugadores', async () => {
    // Act
    const usuarios = await request(servidor())
      .get('/usuarios')
      .set(conToken(tokenAdmin));
    const jugadores = await request(servidor())
      .get('/jugadores')
      .set(conToken(tokenAdmin));
    const comoJugador = await request(servidor())
      .get('/usuarios')
      .set(conToken(tokenJugador));

    // Assert
    expect(usuarios.status).toBe(200);
    expect(JSON.stringify(usuarios.body)).not.toContain('argon2');
    expect(
      usuarios.body.find(
        (u: { email: string }) => u.email === 'jugador@ligahub.test',
      ).jugador,
    ).toMatchObject({ nombres: expect.any(String) });
    expect(jugadores.status).toBe(200);
    expect(
      jugadores.body.filter((j: { usuarioId: number | null }) => j.usuarioId)
        .length,
    ).toBe(1);
    expect(comoJugador.status).toBe(403);
  });

  it('valida los datos: rol Jugador sin jugador (400) y email repetido (409)', async () => {
    // Act
    const sinJugador = await request(servidor())
      .post('/usuarios')
      .set(conToken(tokenAdmin))
      .send({
        email: emailPrueba,
        contrasenia: 'una-contraseña-larga',
        roles: [3],
      });
    const repetido = await request(servidor())
      .post('/usuarios')
      .set(conToken(tokenAdmin))
      .send({
        email: 'Asistente@LigaHub.test',
        contrasenia: 'una-contraseña-larga',
        roles: [2],
      });

    // Assert
    expect(sinJugador.status).toBe(400);
    expect(sinJugador.body.detalles[0].campo).toBe('jugadorId');
    expect(repetido.status).toBe(409);
  });

  it('el Administrador no puede borrarse a sí mismo', async () => {
    // Act
    const respuesta = await request(servidor())
      .delete('/usuarios/1')
      .set(conToken(tokenAdmin));

    // Assert
    expect(respuesta.status).toBe(409);
  });

  it('ciclo completo: alta, login, cambio de rol, cambio de contraseña y baja', async () => {
    // Alta
    const alta = await request(servidor())
      .post('/usuarios')
      .set(conToken(tokenAdmin))
      .send({
        email: emailPrueba,
        contrasenia: 'contraseña-inicial',
        roles: [2],
      });
    expect(alta.status).toBe(201);
    const id = alta.body.id;

    // El usuario nuevo puede iniciar sesión.
    const primerLogin = await login(emailPrueba, 'contraseña-inicial');
    expect(primerLogin.status).toBe(200);
    const tokenNuevo = primerLogin.body.token;

    // El cambio de rol rige en el pedido siguiente, con el mismo token.
    const sinPermiso = await request(servidor())
      .post('/torneos')
      .set(conToken(tokenNuevo))
      .send({ nombre: 'No', anio: 2026 });
    expect(sinPermiso.status).toBe(403);
    const cambioRol = await request(servidor())
      .patch(`/usuarios/${id}`)
      .set(conToken(tokenAdmin))
      .send({ roles: [1] });
    expect(cambioRol.body.roles).toEqual([1]);
    const yo = await request(servidor())
      .get('/auth/yo')
      .set(conToken(tokenNuevo));
    expect(yo.body.roles).toEqual([1]);

    // Cambio de contraseña: la anterior deja de servir.
    const cambio = await request(servidor())
      .patch(`/usuarios/${id}/contrasenia`)
      .set(conToken(tokenAdmin))
      .send({ contrasenia: 'contraseña-nueva-123' });
    expect(cambio.status).toBe(204);
    expect((await login(emailPrueba, 'contraseña-inicial')).status).toBe(401);
    expect((await login(emailPrueba, 'contraseña-nueva-123')).status).toBe(200);

    // Baja: el token del usuario borrado deja de servir enseguida.
    const baja = await request(servidor())
      .delete(`/usuarios/${id}`)
      .set(conToken(tokenAdmin));
    expect(baja.status).toBe(204);
    const despues = await request(servidor())
      .get('/auth/yo')
      .set(conToken(tokenNuevo));
    expect(despues.status).toBe(401);
  });
});

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from './../src/app.module.js';

/**
 * Test de integración del login: levanta la API completa contra la base del .env (con el seed
 * cargado) y la usa por HTTP. Equivale a un test con WebApplicationFactory en ASP.NET Core.
 */
describe('Autenticación (e2e)', () => {
  let app: INestApplication<App>;
  const contrasenia = process.env.SEED_CONTRASENIA ?? '';

  // Una aplicación nueva por test: el contador de intentos de login arranca de cero.
  beforeEach(async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = modulo.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  /** Inicia sesión y devuelve la respuesta HTTP. */
  const login = (email: string, clave: string) =>
    request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, contrasenia: clave });

  it('POST /auth/login con credenciales correctas devuelve el token y el usuario, sin el hash', async () => {
    // Act
    const respuesta = await login('administrador@ligahub.test', contrasenia);

    // Assert
    expect(respuesta.status).toBe(200);
    expect(respuesta.body.token).toEqual(expect.any(String));
    expect(respuesta.body.usuario).toMatchObject({
      email: 'administrador@ligahub.test',
      roles: [1],
    });
    expect(JSON.stringify(respuesta.body)).not.toContain('argon2');
  });

  /** Devuelve la cookie del token de refresco ("nombre=valor") de una respuesta, o undefined. */
  const cookieRefresco = (respuesta: request.Response) =>
    ([] as string[])
      .concat(respuesta.headers['set-cookie'] ?? [])
      .find((cookie) => cookie.startsWith('ligahub_refresco='));

  /** Pide un token de acceso nuevo con la cookie indicada. */
  const refrescar = (cookie: string) =>
    request(app.getHttpServer())
      .post('/auth/refrescar')
      .set('Cookie', cookie.split(';')[0]);

  it('POST /auth/login deja el token de refresco en una cookie httpOnly, segura, SameSite y solo para /auth', async () => {
    // Act
    const respuesta = await login('administrador@ligahub.test', contrasenia);

    // Assert: la cookie existe y su valor no aparece en el cuerpo.
    const cookie = cookieRefresco(respuesta);
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\/auth/i);
    const valor = cookie!.split(';')[0].split('=')[1];
    expect(JSON.stringify(respuesta.body)).not.toContain(valor);
  });

  it('POST /auth/refrescar entrega un token de acceso nuevo y otra cookie; la anterior ya no sirve y reutilizarla corta la sesión', async () => {
    // Arrange
    const cookieLogin = cookieRefresco(
      await login('asistente@ligahub.test', contrasenia),
    )!;

    // Act
    const refresco = await refrescar(cookieLogin);
    const cookieNueva = cookieRefresco(refresco)!;
    const reutilizada = await refrescar(cookieLogin);
    const nuevaDespuesDelRobo = await refrescar(cookieNueva);

    // Assert: el refresco funciona y el token nuevo sirve para la API.
    expect(refresco.status).toBe(200);
    expect(refresco.body.usuario.email).toBe('asistente@ligahub.test');
    expect(cookieNueva).not.toBe(cookieLogin);
    const yo = await request(app.getHttpServer())
      .get('/auth/yo')
      .set('Authorization', `Bearer ${refresco.body.token}`);
    expect(yo.status).toBe(200);
    // Reutilizar la cookie vieja responde 401, la borra y revoca también la nueva.
    expect(reutilizada.status).toBe(401);
    expect(cookieRefresco(reutilizada)).toMatch(/ligahub_refresco=;/);
    expect(nuevaDespuesDelRobo.status).toBe(401);
  });

  it('POST /auth/refrescar sin cookie responde 401', async () => {
    // Act
    const respuesta = await request(app.getHttpServer()).post(
      '/auth/refrescar',
    );

    // Assert
    expect(respuesta.status).toBe(401);
    expect(respuesta.body.mensaje).toBe(
      'La sesión venció o no es válida. Iniciá sesión de nuevo.',
    );
  });

  it('POST /auth/cerrar-sesion revoca la sesión y borra la cookie', async () => {
    // Arrange
    const cookie = cookieRefresco(
      await login('jugador@ligahub.test', contrasenia),
    )!;

    // Act
    const cierre = await request(app.getHttpServer())
      .post('/auth/cerrar-sesion')
      .set('Cookie', cookie.split(';')[0]);
    const refrescoDespues = await refrescar(cookie);

    // Assert
    expect(cierre.status).toBe(204);
    expect(cookieRefresco(cierre)).toMatch(/ligahub_refresco=;/);
    expect(refrescoDespues.status).toBe(401);
  });

  it('POST /auth/login con contraseña incorrecta o email inexistente responde 401 con el mismo mensaje', async () => {
    // Act
    const [incorrecta, inexistente] = [
      await login('administrador@ligahub.test', 'contraseña-incorrecta'),
      await login('nadie@ligahub.test', contrasenia),
    ];

    // Assert
    for (const respuesta of [incorrecta, inexistente]) {
      expect(respuesta.status).toBe(401);
      expect(respuesta.body.mensaje).toBe('Credenciales inválidas.');
    }
  });

  it('POST /auth/login con un email mal formado responde 400', async () => {
    // Act
    const respuesta = await login('no-es-un-email', 'lo que sea');

    // Assert
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.detalles[0].campo).toBe('email');
  });

  it('GET /auth/yo devuelve el usuario con un token válido y 401 sin token o con uno adulterado', async () => {
    // Arrange
    const { body } = await login('jugador@ligahub.test', contrasenia);
    const servidor = app.getHttpServer();

    // Act
    const conToken = await request(servidor)
      .get('/auth/yo')
      .set('Authorization', `Bearer ${body.token}`);
    const sinToken = await request(servidor).get('/auth/yo');
    const adulterado = await request(servidor)
      .get('/auth/yo')
      .set('Authorization', `Bearer ${body.token}x`);

    // Assert
    expect(conToken.status).toBe(200);
    expect(conToken.body).toMatchObject({
      email: 'jugador@ligahub.test',
      roles: [3],
      jugadorId: expect.any(Number),
    });
    expect(sinToken.status).toBe(401);
    expect(sinToken.body.mensaje).toBe('Tenés que iniciar sesión.');
    expect(adulterado.status).toBe(401);
  });

  it('POST /auth/login responde 429 a partir del sexto intento en un minuto', async () => {
    // Act: cinco intentos permitidos y un sexto.
    for (let intento = 1; intento <= 5; intento++) {
      const respuesta = await login('administrador@ligahub.test', 'incorrecta');
      expect(respuesta.status).toBe(401);
    }
    const sexto = await login('administrador@ligahub.test', contrasenia);

    // Assert: bloqueado aunque esta vez la contraseña sea la correcta.
    expect(sexto.status).toBe(429);
    expect(sexto.body.mensaje).toContain('Demasiados intentos');
  });
});

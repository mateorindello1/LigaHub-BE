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

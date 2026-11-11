import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import sharp from 'sharp';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './../src/app.module.js';

/**
 * Test de integración de las fotos de perfil: la API completa, con la base del .env y el
 * almacenamiento de AZURE_STORAGE_CONNECTION_STRING (Azurite en desarrollo: pnpm storage:local).
 * Deja al Jugador del seed sin foto, como estaba.
 */
describe('Fotos de perfil (e2e)', () => {
  let app: INestApplication<App>;
  const contrasenia = process.env.SEED_CONTRASENIA;
  let tokenJugador: string;
  let tokenAsistente: string;
  let tokenAdmin: string;
  let idJugador: number;

  const servidor = () => app.getHttpServer();
  const conToken = (token: string) => ({ Authorization: `Bearer ${token}` });
  const login = (email: string) =>
    request(servidor()).post('/auth/login').send({ email, contrasenia });
  /** Sube un archivo como foto del Jugador. */
  const subir = (contenido: Buffer, nombre = 'foto.png') =>
    request(servidor())
      .put('/usuarios/yo/foto')
      .set(conToken(tokenJugador))
      .attach('foto', contenido, nombre);

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = modulo.createNestApplication();
    await app.init();

    const jugador = await login('jugador@ligahub.test');
    tokenJugador = jugador.body.token;
    idJugador = jugador.body.usuario.id;
    tokenAsistente = (await login('asistente@ligahub.test')).body.token;
    tokenAdmin = (await login('administrador@ligahub.test')).body.token;
  });

  afterAll(async () => {
    // Limpieza: el Jugador queda sin foto aunque un test falle a mitad de camino.
    await request(servidor())
      .delete('/usuarios/yo/foto')
      .set(conToken(tokenJugador));
    await app.close();
  });

  it('el usuario sube su foto y la ven él y el Administrador, pero no otro usuario', async () => {
    // Arrange: una imagen PNG de 800 × 600.
    const png = await sharp({
      create: { width: 800, height: 600, channels: 3, background: '#2e7d32' },
    })
      .png()
      .toBuffer();

    // Act
    const subida = await subir(png);
    const propia = await request(servidor())
      .get(`/usuarios/${idJugador}/foto`)
      .set(conToken(tokenJugador));
    const comoAdmin = await request(servidor())
      .get(`/usuarios/${idJugador}/foto`)
      .set(conToken(tokenAdmin));
    const comoAsistente = await request(servidor())
      .get(`/usuarios/${idJugador}/foto`)
      .set(conToken(tokenAsistente));

    // Assert: queda guardada como WebP de 256 × 256.
    expect(subida.status).toBe(200);
    expect(subida.body.fotoPerfil).toMatch(/\.webp$/);
    expect(propia.status).toBe(200);
    expect(propia.headers['content-type']).toBe('image/webp');
    const { width, height } = await sharp(propia.body as Buffer).metadata();
    expect([width, height]).toEqual([256, 256]);
    expect(comoAdmin.status).toBe(200);
    expect(comoAsistente.status).toBe(403);
  });

  it('rechaza lo que no es una imagen (400), un archivo de más de 2 MB (413) y un pedido sin archivo (400)', async () => {
    // Act
    const texto = await subir(Buffer.from('no soy una imagen'), 'foto.png');
    const grande = await subir(Buffer.alloc(3 * 1024 * 1024), 'grande.png');
    const sinArchivo = await request(servidor())
      .put('/usuarios/yo/foto')
      .set(conToken(tokenJugador));

    // Assert
    expect(texto.status).toBe(400);
    expect(texto.body.mensaje).toBe(
      'El archivo tiene que ser una imagen JPG, PNG o WebP.',
    );
    expect(grande.status).toBe(413);
    expect(grande.body.mensaje).toContain('2 MB');
    expect(sinArchivo.status).toBe(400);
  });

  it('desde una dirección: rechaza la propia máquina (SSRF) y una dirección inválida', async () => {
    // Act: Azurite está en la misma máquina; la API no tiene que conectarse a él por pedido de un usuario.
    const local = await request(servidor())
      .put('/usuarios/yo/foto/url')
      .set(conToken(tokenJugador))
      .send({ url: 'http://127.0.0.1:10000/devstoreaccount1/fotos-perfil' });
    const invalida = await request(servidor())
      .put('/usuarios/yo/foto/url')
      .set(conToken(tokenJugador))
      .send({ url: 'no es una dirección' });

    // Assert
    expect(local.status).toBe(400);
    expect(local.body.mensaje).toContain('no está permitida');
    expect(invalida.status).toBe(400);
    expect(invalida.body.detalles[0].campo).toBe('url');
  });

  it('el usuario quita su foto: después responde 404', async () => {
    // Act
    const quitada = await request(servidor())
      .delete('/usuarios/yo/foto')
      .set(conToken(tokenJugador));
    const despues = await request(servidor())
      .get(`/usuarios/${idJugador}/foto`)
      .set(conToken(tokenJugador));

    // Assert
    expect(quitada.status).toBe(200);
    expect(quitada.body.fotoPerfil).toBeNull();
    expect(despues.status).toBe(404);
  });

  it('sin sesión no se puede subir ni ver una foto (401)', async () => {
    // Act
    const subida = await request(servidor()).put('/usuarios/yo/foto');
    const vista = await request(servidor()).get(`/usuarios/${idJugador}/foto`);

    // Assert
    expect(subida.status).toBe(401);
    expect(vista.status).toBe(401);
  });
});

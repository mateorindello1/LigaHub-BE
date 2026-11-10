import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './../src/app.module.js';

/** Partido tal como lo devuelve GET /torneos/:id/fixture (lo que usa el test). */
interface PartidoFixture {
  id: string;
  estadoPartido: number;
  fechaHora: string | null;
  local: { id: number };
  visitante: { id: number };
  cancha: { id: number } | null;
}

/**
 * Test de integración de predios, canchas y programación de partidos (AD-3): la API completa
 * contra la base del .env, con el seed cargado. Crea un predio de prueba con una cancha, programa
 * partidos de la última fecha de Apertura en ella y al final deja todo como estaba.
 *
 * Usa 2 logins (administrador y asistente).
 */
describe('Predios, canchas y programación (e2e)', () => {
  let app: INestApplication<App>;
  const tokens = { administrador: '', asistente: '' };
  const servidor = () => app.getHttpServer();
  const conToken = (usuario: keyof typeof tokens) => ({
    Authorization: `Bearer ${tokens[usuario]}`,
  });
  const nombrePredio = `Prueba e2e ${Date.now()}`;

  /** Borra los predios de prueba que hayan quedado de una corrida anterior, con sus canchas. */
  const limpiarPrediosDePrueba = async () => {
    const predios = await request(servidor()).get('/predios');
    for (const predio of predios.body as {
      id: number;
      nombre: string;
      canchas: { id: number }[];
    }[]) {
      if (!predio.nombre.startsWith('Prueba e2e')) continue;
      for (const cancha of predio.canchas) {
        await request(servidor())
          .delete(`/predios/${predio.id}/canchas/${cancha.id}`)
          .set(conToken('administrador'));
      }
      await request(servidor())
        .delete(`/predios/${predio.id}`)
        .set(conToken('administrador'));
    }
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = modulo.createNestApplication();
    await app.init();

    for (const usuario of Object.keys(tokens) as (keyof typeof tokens)[]) {
      const respuesta = await request(servidor())
        .post('/auth/login')
        .send({
          email: `${usuario}@ligahub.test`,
          contrasenia: process.env.SEED_CONTRASENIA,
        });
      tokens[usuario] = respuesta.body.token;
    }
    await limpiarPrediosDePrueba();
  }, 60_000);

  afterAll(async () => {
    await limpiarPrediosDePrueba();
    await app.close();
  }, 60_000);

  it('ciclo de predio y cancha, con sus reglas y permisos', async () => {
    // Act: alta como Asistente (403) y como Administrador.
    const comoAsistente = await request(servidor())
      .post('/predios')
      .set(conToken('asistente'))
      .send({ nombre: nombrePredio, direccion: 'Calle 1' });
    const predio = await request(servidor())
      .post('/predios')
      .set(conToken('administrador'))
      .send({ nombre: nombrePredio, direccion: 'Calle 1' });
    const repetido = await request(servidor())
      .post('/predios')
      .set(conToken('administrador'))
      .send({ nombre: nombrePredio.toUpperCase(), direccion: 'Calle 2' });
    const rutaCanchas = `/predios/${predio.body.id}/canchas`;
    const cancha = await request(servidor())
      .post(rutaCanchas)
      .set(conToken('administrador'))
      .send({ numero: 1, descripcion: 'Fútbol 5' });
    const numeroRepetido = await request(servidor())
      .post(rutaCanchas)
      .set(conToken('administrador'))
      .send({ numero: 1, descripcion: 'Otra' });
    const numeroInvalido = await request(servidor())
      .post(rutaCanchas)
      .set(conToken('administrador'))
      .send({ numero: 0, descripcion: 'Otra' });
    const borrarConCanchas = await request(servidor())
      .delete(`/predios/${predio.body.id}`)
      .set(conToken('administrador'));
    const listado = await request(servidor()).get('/predios');

    // Assert
    expect(comoAsistente.status).toBe(403);
    expect(predio.status).toBe(201);
    expect(repetido.status).toBe(409);
    expect(cancha.status).toBe(201);
    expect(numeroRepetido.status).toBe(409);
    expect(numeroInvalido.status).toBe(400);
    expect(borrarConCanchas.status).toBe(409);
    expect(
      listado.body.find((p: { id: number }) => p.id === predio.body.id),
    ).toMatchObject({ canchas: [{ numero: 1, descripcion: 'Fútbol 5' }] });
  }, 30_000);

  it('programa partidos sin superponer canchas ni equipos, y los deja como estaban', async () => {
    // Arrange: la cancha de prueba y la última fecha de Apertura (en curso, sin jugar).
    const predios = await request(servidor()).get('/predios');
    const predioPrueba = predios.body.find(
      (p: { nombre: string }) => p.nombre === nombrePredio,
    );
    const canchaPrueba: number = predioPrueba.canchas[0].id;
    const torneos = await request(servidor()).get('/torneos');
    const apertura = torneos.body.find(
      (t: { estadoTorneo: number }) => t.estadoTorneo === 2,
    );
    const fixture = await request(servidor()).get(
      `/torneos/${apertura.id}/fixture`,
    );
    const fechas = fixture.body as { partidos: PartidoFixture[] }[];
    const [p, q] = fechas[fechas.length - 1].partidos;
    // Un partido de la fecha anterior en el que juega un equipo de p.
    const equiposDeP = [p.local.id, p.visitante.id];
    const r = fechas[fechas.length - 2].partidos.find(
      (partido) =>
        equiposDeP.includes(partido.local.id) ||
        equiposDeP.includes(partido.visitante.id),
    )!;
    const jugado = fechas[0].partidos[0];
    const originales = [p, q, r].map((partido) => ({
      id: partido.id,
      fechaHora: partido.fechaHora,
      canchaId: partido.cancha?.id ?? null,
    }));
    const programar = (id: string, cuerpo: object) =>
      request(servidor())
        .patch(`/partidos/${id}/programacion`)
        .set(conToken('administrador'))
        .send(cuerpo);

    try {
      // Act
      const programado = await programar(p.id, {
        fechaHora: '2030-01-05T18:00:00-03:00',
        canchaId: canchaPrueba,
      });
      const canchaOcupada = await programar(q.id, {
        fechaHora: '2030-01-05T18:30:00-03:00',
        canchaId: canchaPrueba,
      });
      const equipoOcupado = await programar(r.id, {
        fechaHora: '2030-01-05T18:30:00-03:00',
        canchaId: null,
      });
      const horaSiguiente = await programar(q.id, {
        fechaHora: '2030-01-05T19:00:00-03:00',
        canchaId: canchaPrueba,
      });
      const yaJugado = await programar(jugado.id, {
        fechaHora: '2030-01-05T20:00:00-03:00',
      });
      const comoAsistente = await request(servidor())
        .patch(`/partidos/${p.id}/programacion`)
        .set(conToken('asistente'))
        .send({ canchaId: null });
      const borrarCanchaUsada = await request(servidor())
        .delete(`/predios/${predioPrueba.id}/canchas/${canchaPrueba}`)
        .set(conToken('administrador'));

      // Assert
      expect(programado.status).toBe(200);
      expect(programado.body).toMatchObject({
        fechaHora: '2030-01-05T21:00:00.000Z',
        cancha: { id: canchaPrueba, numero: 1, predio: nombrePredio },
      });
      expect(canchaOcupada.status).toBe(409);
      expect(canchaOcupada.body.mensaje).toContain('está ocupada');
      expect(equipoOcupado.status).toBe(409);
      expect(equipoOcupado.body.mensaje).toContain('ya juega a esa hora');
      expect(horaSiguiente.status).toBe(200);
      expect(yaJugado.status).toBe(409);
      expect(comoAsistente.status).toBe(403);
      expect(borrarCanchaUsada.status).toBe(409);
    } finally {
      // Deja los partidos como estaban, aunque algo haya fallado.
      for (const original of originales) {
        await programar(original.id, {
          fechaHora: original.fechaHora,
          canchaId: original.canchaId,
        });
      }
    }
  }, 60_000);
});

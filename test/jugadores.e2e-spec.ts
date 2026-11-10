import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './../src/app.module.js';

/**
 * Test de integración de jugadores e inscripciones de jugadores (AD-2): la API completa contra
 * la base del .env, con el seed cargado. Crea un jugador de prueba, lo inscribe en un equipo del
 * torneo con inscripciones abiertas y al final borra todo lo que creó.
 *
 * Usa 3 logins (administrador, asistente y jugador). Cada test hace muchos pedidos a la base en la
 * nube, así que tienen 30 segundos en lugar de los 5 por defecto.
 */
describe('Jugadores e inscripciones de jugadores (e2e)', () => {
  let app: INestApplication<App>;
  const tokens = { administrador: '', asistente: '', jugador: '' };
  /** Jugador asociado al usuario jugador@ligahub.test (el capitán del primer equipo). */
  let idJugadorPropio = 0;

  const servidor = () => app.getHttpServer();
  const conToken = (usuario: keyof typeof tokens) => ({
    Authorization: `Bearer ${tokens[usuario]}`,
  });

  /**
   * Borra los jugadores de prueba (email "prueba-…") con sus inscripciones. Corre antes y después
   * de los tests: si una corrida anterior falló a mitad de camino, no deja datos que hagan fallar
   * la siguiente (por ejemplo, un dorsal ocupado).
   */
  const limpiarJugadoresDePrueba = async () => {
    const jugadores = await request(servidor())
      .get('/jugadores')
      .set(conToken('administrador'));
    const dePrueba = (jugadores.body as { id: number; email: string }[]).filter(
      (j) => j.email.startsWith('prueba-'),
    );
    for (const { id } of dePrueba) {
      const detalle = await request(servidor())
        .get(`/jugadores/${id}`)
        .set(conToken('administrador'));
      for (const inscripcion of detalle.body.inscripciones) {
        await request(servidor())
          .delete(
            `/torneos/${inscripcion.torneo.id}/inscripciones/${inscripcion.inscripcionEquipoId}/jugadores/${inscripcion.id}`,
          )
          .set(conToken('administrador'));
      }
      await request(servidor())
        .delete(`/jugadores/${id}`)
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
      if (usuario === 'jugador') {
        idJugadorPropio = respuesta.body.usuario.jugadorId;
      }
    }
    await limpiarJugadoresDePrueba();
  }, 60_000);

  afterAll(async () => {
    await limpiarJugadoresDePrueba();
    await app.close();
  }, 60_000);

  it('el rol Jugador ve y modifica solo sus propios datos de contacto', async () => {
    // Arrange
    const propio = await request(servidor())
      .get(`/jugadores/${idJugadorPropio}`)
      .set(conToken('jugador'));
    const telefonoOriginal: string = propio.body.telefono;

    // Act
    const ajeno = await request(servidor())
      .get(`/jugadores/${idJugadorPropio + 1}`)
      .set(conToken('jugador'));
    const listado = await request(servidor())
      .get('/jugadores')
      .set(conToken('jugador'));
    const comoAsistente = await request(servidor())
      .get(`/jugadores/${idJugadorPropio}`)
      .set(conToken('asistente'));
    const cambioContacto = await request(servidor())
      .patch(`/jugadores/${idJugadorPropio}`)
      .set(conToken('jugador'))
      .send({ telefono: '341-555-0000' });
    const cambioDni = await request(servidor())
      .patch(`/jugadores/${idJugadorPropio}`)
      .set(conToken('jugador'))
      .send({ dni: '12345678' });
    // Deja el teléfono como estaba.
    await request(servidor())
      .patch(`/jugadores/${idJugadorPropio}`)
      .set(conToken('jugador'))
      .send({ telefono: telefonoOriginal });

    // Assert
    expect(propio.status).toBe(200);
    expect(propio.body.inscripciones[0]).toMatchObject({
      capitan: true,
      equipo: { nombre: expect.any(String) },
      torneo: { nombre: expect.any(String) },
    });
    expect(ajeno.status).toBe(403);
    expect(listado.status).toBe(403);
    expect(comoAsistente.status).toBe(403);
    expect(cambioContacto.status).toBe(200);
    expect(cambioContacto.body.telefono).toBe('341-555-0000');
    expect(cambioDni.status).toBe(403);
  }, 30_000);

  it('ciclo del administrador: alta, inscripción con capitanía, reglas y bajas', async () => {
    // Arrange: el torneo con inscripciones abiertas y dos de sus equipos.
    const torneos = await request(servidor()).get('/torneos');
    const torneo = torneos.body.find(
      (t: { estadoTorneo: number }) => t.estadoTorneo === 1,
    );
    const equipos = await request(servidor()).get(
      `/torneos/${torneo.id}/inscripciones`,
    );
    const [equipoA, equipoB] = equipos.body as { id: string }[];
    const rutaA = `/torneos/${torneo.id}/inscripciones/${equipoA.id}/jugadores`;
    const rutaB = `/torneos/${torneo.id}/inscripciones/${equipoB.id}/jugadores`;
    const dni = String(90_000_000 + (Date.now() % 9_999_999));
    const datos = {
      dni,
      nombres: 'Prueba',
      apellidos: 'De Integración',
      email: `prueba-${dni}@ligahub.test`,
      telefono: '341-555-1234',
      direccion: 'Calle Falsa 123',
    };

    // Act: alta del jugador y DNI repetido.
    const alta = await request(servidor())
      .post('/jugadores')
      .set(conToken('administrador'))
      .send(datos);
    const repetido = await request(servidor())
      .post('/jugadores')
      .set(conToken('administrador'))
      .send(datos);
    const idJugador: number = alta.body.id;

    // Act: inscripción como capitán, y las reglas del plantel.
    const inscripcion = await request(servidor())
      .post(rutaA)
      .set(conToken('administrador'))
      .send({ jugadorId: idJugador, dorsal: 10, capitan: true });
    const enOtroEquipo = await request(servidor())
      .post(rutaB)
      .set(conToken('administrador'))
      .send({ jugadorId: idJugador, dorsal: 10 });
    const dorsalRepetido = await request(servidor())
      .post(rutaA)
      .set(conToken('administrador'))
      .send({ jugadorId: idJugadorPropio, dorsal: 10 });
    const disponibles = await request(servidor())
      .get(`/jugadores?disponiblesEnTorneo=${torneo.id}`)
      .set(conToken('administrador'));
    const plantelPublico = await request(servidor()).get(rutaA);
    const borrarInscripto = await request(servidor())
      .delete(`/jugadores/${idJugador}`)
      .set(conToken('administrador'));

    // Act: bajas.
    const bajaInscripcion = await request(servidor())
      .delete(`${rutaA}/${inscripcion.body.id}`)
      .set(conToken('administrador'));
    const bajaJugador = await request(servidor())
      .delete(`/jugadores/${idJugador}`)
      .set(conToken('administrador'));

    // Assert
    expect(alta.status).toBe(201);
    expect(alta.body).toMatchObject({ dni, usuarioId: null });
    expect(repetido.status).toBe(409);
    expect(inscripcion.status).toBe(201);
    expect(inscripcion.body).toMatchObject({ dorsal: 10, capitan: true });
    expect(enOtroEquipo.status).toBe(409);
    expect(dorsalRepetido.status).toBe(409);
    expect(
      disponibles.body.some((j: { id: number }) => j.id === idJugador),
    ).toBe(false);
    expect(plantelPublico.status).toBe(200);
    expect(JSON.stringify(plantelPublico.body)).not.toContain(dni);
    expect(borrarInscripto.status).toBe(409);
    expect(bajaInscripcion.status).toBe(204);
    expect(bajaJugador.status).toBe(204);
  }, 30_000);

  it('solo el Administrador inscribe jugadores', async () => {
    // Arrange
    const torneos = await request(servidor()).get('/torneos');
    const torneo = torneos.body[0];
    const equipos = await request(servidor()).get(
      `/torneos/${torneo.id}/inscripciones`,
    );
    const ruta = `/torneos/${torneo.id}/inscripciones/${equipos.body[0].id}/jugadores`;

    // Act
    const sinSesion = await request(servidor())
      .post(ruta)
      .send({ jugadorId: 1, dorsal: 50 });
    const comoAsistente = await request(servidor())
      .post(ruta)
      .set(conToken('asistente'))
      .send({ jugadorId: 1, dorsal: 50 });

    // Assert
    expect(sinSesion.status).toBe(401);
    expect(comoAsistente.status).toBe(403);
  }, 30_000);
});

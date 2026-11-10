import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './../src/app.module.js';

/** Jugador del plantel en la planilla (lo que usa el test). */
interface JugadorPlanilla {
  inscripcionJugadorId: string;
}

/** Línea de la tabla de posiciones (lo que usa el test). */
interface FilaPosiciones {
  equipo: { id: number };
  partidosJugados: number;
}

/**
 * Test de integración del caso de uso "cargar el resultado de un partido" (AD-4): la API completa
 * contra la base del .env, con el seed cargado. Carga resultados en el primer partido de la fecha 4
 * de Apertura (programado y con fecha pasada) y al final lo deja programado, como estaba.
 *
 * Usa 3 logins (administrador, asistente y jugador).
 */
describe('Carga del resultado de un partido (e2e)', () => {
  let app: INestApplication<App>;
  const tokens = { administrador: '', asistente: '', jugador: '' };
  const servidor = () => app.getHttpServer();
  const conToken = (usuario: keyof typeof tokens) => ({
    Authorization: `Bearer ${tokens[usuario]}`,
  });

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
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it('carga, corrige y anula un resultado, y la tabla se actualiza sola', async () => {
    // Arrange: Apertura, su fecha 4 y el primer partido (programado).
    const torneos = await request(servidor()).get('/torneos');
    const apertura = torneos.body.find(
      (t: { estadoTorneo: number }) => t.estadoTorneo === 2,
    );
    const fixture = await request(servidor()).get(
      `/torneos/${apertura.id}/fixture`,
    );
    const partidoId: string = fixture.body[3].partidos[0].id;
    // Un jugador de otro partido de la fecha: no es de ninguno de los dos equipos.
    const otroPartido = await request(servidor()).get(
      `/partidos/${fixture.body[3].partidos[1].id}`,
    );
    const ajeno: string =
      otroPartido.body.local.plantel[0].inscripcionJugadorId;

    const resultado = (usuario: keyof typeof tokens, cuerpo: object) =>
      request(servidor())
        .put(`/partidos/${partidoId}/resultado`)
        .set(conToken(usuario))
        .send(cuerpo);
    const jugadosDelLocal = async (equipoId: number) => {
      const tabla = await request(servidor()).get(
        `/torneos/${apertura.id}/posiciones`,
      );
      return (tabla.body as FilaPosiciones[]).find(
        (fila) => fila.equipo.id === equipoId,
      )!.partidosJugados;
    };

    const planilla = await request(servidor()).get(`/partidos/${partidoId}`);
    const local: string[] = planilla.body.local.plantel.map(
      (j: JugadorPlanilla) => j.inscripcionJugadorId,
    );
    const visitante: string[] = planilla.body.visitante.plantel.map(
      (j: JugadorPlanilla) => j.inscripcionJugadorId,
    );
    const equipoLocalId: number = planilla.body.local.id;
    const jugadosAntes = await jugadosDelLocal(equipoLocalId);

    try {
      // Act: planilla jugada. Local: 2 goles. Visitante: 1 gol y un gol en contra de un local.
      const comoJugador = await resultado('jugador', {
        estadoPartido: 4,
      });
      const conAjeno = await resultado('asistente', {
        estadoPartido: 2,
        jugadores: [local[0], ajeno],
      });
      const jugado = await resultado('asistente', {
        estadoPartido: 2,
        jugadores: [...local, ...visitante],
        eventos: [
          { tipoEvento: 1, minuto: 10, inscripcionJugadorId: local[0] },
          { tipoEvento: 1, minuto: 25, inscripcionJugadorId: visitante[0] },
          { tipoEvento: 3, minuto: 30, inscripcionJugadorId: visitante[1] },
          { tipoEvento: 1, minuto: 50, inscripcionJugadorId: local[1] },
          { tipoEvento: 2, minuto: 70, inscripcionJugadorId: local[2] },
          {
            tipoEvento: 5,
            minuto: 75,
            inscripcionJugadorId: local[3],
            inscripcionJugadorEntraId: local[4],
          },
        ],
      });
      const jugadosDespues = await jugadosDelLocal(equipoLocalId);

      // Un jugador que jugó ya no se puede dar de baja del plantel (regla de AD-2).
      const inscripcionLocal = (
        await request(servidor()).get(`/torneos/${apertura.id}/inscripciones`)
      ).body.find((i: { equipoId: number }) => i.equipoId === equipoLocalId);
      const bajaDeQuienJugo = await request(servidor())
        .delete(
          `/torneos/${apertura.id}/inscripciones/${inscripcionLocal.id}/jugadores/${local[0]}`,
        )
        .set(conToken('administrador'));

      // Corrección: W.O. a favor del visitante.
      const wo = await resultado('administrador', {
        estadoPartido: 3,
        equipoGanadorId: planilla.body.visitante.id,
      });

      // Anulación: vuelve a Programado.
      const anulacion = await request(servidor())
        .delete(`/partidos/${partidoId}/resultado`)
        .set(conToken('asistente'));
      const despuesDeAnular = await request(servidor()).get(
        `/partidos/${partidoId}`,
      );
      const jugadosAlFinal = await jugadosDelLocal(equipoLocalId);

      // Assert
      expect(planilla.status).toBe(200);
      expect(local.length).toBeGreaterThan(4);
      expect(comoJugador.status).toBe(403);
      expect(conAjeno.status).toBe(400);
      expect(jugado.status).toBe(200);
      expect(jugado.body).toMatchObject({
        estadoPartido: 2,
        golesLocal: 2,
        golesVisitante: 2,
      });
      expect(jugado.body.eventos).toHaveLength(6);
      expect(jugado.body.eventos[5]).toMatchObject({
        tipoEvento: 5,
        inscripcionJugadorEntraId: local[4],
      });
      expect(jugadosDespues).toBe(jugadosAntes + 1);
      expect(bajaDeQuienJugo.status).toBe(409);
      expect(wo.status).toBe(200);
      expect(wo.body).toMatchObject({
        estadoPartido: 3,
        golesLocal: 0,
        golesVisitante: 3,
        eventos: [],
      });
      expect(anulacion.status).toBe(204);
      expect(despuesDeAnular.body).toMatchObject({
        estadoPartido: 1,
        golesLocal: null,
        eventos: [],
      });
      expect(jugadosAlFinal).toBe(jugadosAntes);
    } finally {
      // Deja el partido programado aunque algo haya fallado (si ya lo está, responde 409).
      await request(servidor())
        .delete(`/partidos/${partidoId}/resultado`)
        .set(conToken('administrador'));
    }
  }, 60_000);
});

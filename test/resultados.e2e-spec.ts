import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './../src/app.module.js';

/** Jugador del plantel en la planilla (lo que usa el test). */
interface JugadorPlanilla {
  inscripcionJugadorId: string;
  suspendido: boolean;
}

/** Partido del fixture (lo que usa el test). */
interface PartidoFixture {
  id: string;
  local: { id: number };
  visitante: { id: number };
}

/** Sanción del listado de suspensiones (lo que usa el test). */
interface Sancion {
  inscripcionJugadorId: string;
  motivo: string;
  numeroFecha: number;
  partidos: { partidoId: string; cumplida: boolean }[];
  cumplida: boolean;
}

/** Inscripciones de los jugadores del plantel que pueden jugar (no cumplen una suspensión). */
const disponibles = (plantel: JugadorPlanilla[]): string[] =>
  plantel.filter((j) => !j.suspendido).map((j) => j.inscripcionJugadorId);

/** Línea de la tabla de posiciones (lo que usa el test). */
interface FilaPosiciones {
  equipo: { id: number };
  partidosJugados: number;
}

/**
 * Test de integración del caso de uso "cargar el resultado de un partido" (AD-4): la API completa
 * contra la base del .env, con el seed cargado. Carga resultados en el primer partido de la fecha 4
 * de Apertura (programado y con fecha pasada) y, para las suspensiones, intenta cargar el partido
 * de su equipo local en la fecha 5. Al final los deja programados, como estaban.
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
    // Sin los suspendidos: la API no deja anotarlos.
    const local = disponibles(planilla.body.local.plantel);
    const visitante = disponibles(planilla.body.visitante.plantel);
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
  it('una expulsión suspende al jugador en el partido siguiente de su equipo', async () => {
    // Arrange: el primer partido de la fecha 4 y el partido de su equipo local en la fecha 5.
    const torneos = await request(servidor()).get('/torneos');
    const apertura = torneos.body.find(
      (t: { estadoTorneo: number }) => t.estadoTorneo === 2,
    );
    const fixture = await request(servidor()).get(
      `/torneos/${apertura.id}/fixture`,
    );
    const partidoId: string = fixture.body[3].partidos[0].id;
    const planilla = await request(servidor()).get(`/partidos/${partidoId}`);
    const equipoId: number = planilla.body.local.id;
    const siguiente: PartidoFixture = fixture.body[4].partidos.find(
      (p: PartidoFixture) =>
        p.local.id === equipoId || p.visitante.id === equipoId,
    );
    const local = disponibles(planilla.body.local.plantel);
    const visitante = disponibles(planilla.body.visitante.plantel);
    const expulsado = local[0];

    try {
      // Act: en la fecha 4 expulsan a un jugador del local.
      const conExpulsion = await request(servidor())
        .put(`/partidos/${partidoId}/resultado`)
        .set(conToken('asistente'))
        .send({
          estadoPartido: 2,
          jugadores: [...local, ...visitante],
          eventos: [
            { tipoEvento: 4, minuto: 60, inscripcionJugadorId: expulsado },
          ],
        });
      const suspensiones = await request(servidor()).get(
        `/torneos/${apertura.id}/suspensiones`,
      );
      const planillaSiguiente = await request(servidor()).get(
        `/partidos/${siguiente.id}`,
      );
      const plantelSiguiente: JugadorPlanilla[] = [
        ...planillaSiguiente.body.local.plantel,
        ...planillaSiguiente.body.visitante.plantel,
      ];
      const conSuspendido = await request(servidor())
        .put(`/partidos/${siguiente.id}/resultado`)
        .set(conToken('asistente'))
        .send({
          estadoPartido: 2,
          jugadores: plantelSiguiente.map((j) => j.inscripcionJugadorId),
        });

      // Assert
      expect(conExpulsion.status).toBe(200);
      const sancion = (suspensiones.body.sanciones as Sancion[]).find(
        (s) => s.inscripcionJugadorId === expulsado && s.numeroFecha === 4,
      );
      expect(sancion).toMatchObject({
        motivo: 'Expulsion',
        partidos: [{ partidoId: siguiente.id, cumplida: false }],
        cumplida: false,
      });
      expect(
        plantelSiguiente.find((j) => j.inscripcionJugadorId === expulsado)
          ?.suspendido,
      ).toBe(true);
      expect(conSuspendido.status).toBe(409);
      expect(conSuspendido.body.mensaje).toContain('suspensión');
    } finally {
      // Deja los dos partidos programados (si ya lo están, responde 409).
      for (const id of [siguiente.id, partidoId]) {
        await request(servidor())
          .delete(`/partidos/${id}/resultado`)
          .set(conToken('administrador'));
      }
    }
  }, 60_000);

  it('los goleadores y las suspensiones se consultan sin sesión; 404 si el torneo no existe', async () => {
    // Arrange
    const torneos = await request(servidor()).get('/torneos');
    const apertura = torneos.body.find(
      (t: { estadoTorneo: number }) => t.estadoTorneo === 2,
    );

    // Act
    const goleadores = await request(servidor()).get(
      `/torneos/${apertura.id}/goleadores`,
    );
    const suspensiones = await request(servidor()).get(
      `/torneos/${apertura.id}/suspensiones`,
    );
    const inexistente = await request(servidor()).get(
      '/torneos/999999/goleadores',
    );

    // Assert: ordenados de más a menos goles, todos con al menos uno.
    expect(goleadores.status).toBe(200);
    const goles = (goleadores.body as { goles: number }[]).map((f) => f.goles);
    expect(goles.length).toBeGreaterThan(0);
    expect(goles).toEqual([...goles].sort((a, b) => b - a));
    expect(goles.every((g) => g > 0)).toBe(true);
    expect(suspensiones.status).toBe(200);
    expect(suspensiones.body).toHaveProperty('sanciones');
    expect(suspensiones.body).toHaveProperty('tarjetas');
    expect(inexistente.status).toBe(404);
  });
});

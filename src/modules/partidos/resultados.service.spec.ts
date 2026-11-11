import { BadRequestException, ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { EstadoTorneo } from '../torneos/estado-torneo.enum.js';
import type { CargarResultadoDto } from './dto/cargar-resultado.dto.js';
import { EstadoPartido } from './estado-partido.enum.js';
import type { SuspensionesService } from '../suspensiones/suspensiones.service.js';
import type {
  DatosResultado,
  JugadorDelPlantel,
  PartidoConPlanilla,
  PartidosRepository,
} from './partidos.repository.js';
import { ResultadosService } from './resultados.service.js';
import { TipoEvento } from './tipo-evento.enum.js';

const LOCAL = 1;
const VISITANTE = 2;
/** Inscripciones: L1 y L2 del local, V1 y V2 del visitante, X de un tercer equipo. */
const L1 = '00000000-0000-4000-8000-000000000001';
const L2 = '00000000-0000-4000-8000-000000000002';
const V1 = '00000000-0000-4000-8000-000000000003';
const V2 = '00000000-0000-4000-8000-000000000004';
const X = '00000000-0000-4000-8000-000000000009';

const HORA_PARTIDO = new Date('2026-11-21T21:00:00Z');
const DESPUES = new Date('2026-11-21T23:00:00Z');

/** Repositorio falso: un partido y el plantel de los dos equipos; guarda el último resultado. */
class RepositorioEnMemoria {
  estadoPartido: number = EstadoPartido.Programado;
  estadoTorneo: number = EstadoTorneo.EnCurso;
  fechaHora: Date | null = HORA_PARTIDO;
  guardado: DatosResultado | null = null;
  anulado = false;

  obtenerPlanilla(): Promise<PartidoConPlanilla> {
    return Promise.resolve({
      id: 'P',
      estadoPartido: this.estadoPartido,
      fechaHoraPartido: this.fechaHora,
      cantidadGolesLocal: this.guardado?.golesLocal ?? null,
      cantidadGolesVisitante: this.guardado?.golesVisitante ?? null,
      equipoLocal: { id: LOCAL, nombre: 'Local', escudoURL: null },
      equipoVisitante: { id: VISITANTE, nombre: 'Visitante', escudoURL: null },
      cancha: null,
      fechaFixture: {
        numeroFecha: 1,
        torneo: { id: 1, nombre: 'Apertura', estadoTorneo: this.estadoTorneo },
      },
      partidoJugadores: (this.guardado?.jugadores ?? []).map((id) => ({
        inscripcionJugadorId: id,
        eventos: [],
      })),
    });
  }
  obtenerPlanteles(): Promise<JugadorDelPlantel[]> {
    const jugador = (id: string, equipoId: number, dorsal: number) => ({
      inscripcionJugadorId: id,
      equipoId,
      dorsal,
      capitan: false,
      jugador: { id: dorsal, nombres: 'Jugador', apellidos: String(dorsal) },
    });
    return Promise.resolve([
      jugador(L1, LOCAL, 1),
      jugador(L2, LOCAL, 2),
      jugador(V1, VISITANTE, 3),
      jugador(V2, VISITANTE, 4),
    ]);
  }
  guardarResultado(_id: string, datos: DatosResultado) {
    this.guardado = datos;
    this.estadoPartido = datos.estadoPartido;
    return Promise.resolve();
  }
  anularResultado() {
    this.anulado = true;
    return Promise.resolve();
  }
}

/** Resultado jugado con los cuatro jugadores y los eventos indicados. */
const jugado = (
  eventos: CargarResultadoDto['eventos'] = [],
): CargarResultadoDto => ({
  estadoPartido: EstadoPartido.Finalizado,
  jugadores: [L1, L2, V1, V2],
  eventos,
});

/** Suspensiones falsas: los jugadores de "suspendidos" no pueden jugar el partido. */
class SuspensionesFalsas {
  suspendidos = new Set<string>();
  suspendidosEn(): Promise<Set<string>> {
    return Promise.resolve(this.suspendidos);
  }
}

describe('ResultadosService', () => {
  let repositorio: RepositorioEnMemoria;
  let suspensiones: SuspensionesFalsas;
  let servicio: ResultadosService;

  beforeEach(() => {
    repositorio = new RepositorioEnMemoria();
    suspensiones = new SuspensionesFalsas();
    servicio = new ResultadosService(
      repositorio as unknown as PartidosRepository,
      suspensiones as unknown as SuspensionesService,
    );
  });

  it('rechaza un jugador que cumple una suspensión en el partido (409) y lo marca en la planilla', async () => {
    // Arrange: V1 está suspendido para este partido.
    suspensiones.suspendidos.add(V1);

    // Act
    const carga = servicio.cargar('P', jugado(), DESPUES);
    const planilla = await servicio.obtenerPlanilla('P');

    // Assert
    await expect(carga).rejects.toThrow(ConflictException);
    await expect(carga).rejects.toThrow('3, Jugador (3)');
    expect(repositorio.guardado).toBeNull();
    const v1 = planilla.visitante.plantel.find(
      (j) => j.inscripcionJugadorId === V1,
    );
    expect(v1?.suspendido).toBe(true);
    expect(planilla.local.plantel.every((j) => !j.suspendido)).toBe(true);
  });

  it('acepta la planilla si el suspendido no figura entre los que jugaron', async () => {
    // Arrange
    suspensiones.suspendidos.add(V1);

    // Act
    await servicio.cargar(
      'P',
      {
        estadoPartido: EstadoPartido.Finalizado,
        jugadores: [L1, L2, V2],
        eventos: [],
      },
      DESPUES,
    );

    // Assert
    expect(repositorio.guardado?.jugadores).toEqual([L1, L2, V2]);
  });

  it('calcula el marcador a partir de los goles y guarda jugadores y eventos', async () => {
    // Arrange: gol de L1, gol de V1 y gol en contra de V2 (suma al local).
    const dto = jugado([
      { tipoEvento: TipoEvento.Gol, minuto: 10, inscripcionJugadorId: L1 },
      { tipoEvento: TipoEvento.Gol, minuto: 20, inscripcionJugadorId: V1 },
      {
        tipoEvento: TipoEvento.GolEnContra,
        minuto: 30,
        inscripcionJugadorId: V2,
      },
      {
        tipoEvento: TipoEvento.Amonestacion,
        minuto: 40,
        inscripcionJugadorId: L2,
      },
    ]);

    // Act
    await servicio.cargar('P', dto, DESPUES);

    // Assert
    expect(repositorio.guardado).toMatchObject({
      estadoPartido: EstadoPartido.Finalizado,
      golesLocal: 2,
      golesVisitante: 1,
      jugadores: [L1, L2, V1, V2],
    });
    expect(repositorio.guardado?.eventos).toHaveLength(4);
  });

  it('rechaza jugadores de otro equipo y eventos de quien no jugó', async () => {
    // Act y Assert
    await expect(
      servicio.cargar(
        'P',
        { estadoPartido: EstadoPartido.Finalizado, jugadores: [L1, X] },
        DESPUES,
      ),
    ).rejects.toThrow(BadRequestException);
    await expect(
      servicio.cargar(
        'P',
        {
          estadoPartido: EstadoPartido.Finalizado,
          jugadores: [L1, V1],
          eventos: [
            { tipoEvento: TipoEvento.Gol, minuto: 5, inscripcionJugadorId: L2 },
          ],
        },
        DESPUES,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('un cambio es entre dos jugadores distintos del mismo equipo', async () => {
    // Arrange
    const cambio = (sale: string, entra: string | null) =>
      jugado([
        {
          tipoEvento: TipoEvento.Cambio,
          minuto: 60,
          inscripcionJugadorId: sale,
          inscripcionJugadorEntraId: entra,
        },
      ]);

    // Act y Assert
    await expect(
      servicio.cargar('P', cambio(L1, null), DESPUES),
    ).rejects.toThrow(BadRequestException);
    await expect(servicio.cargar('P', cambio(L1, L1), DESPUES)).rejects.toThrow(
      BadRequestException,
    );
    await expect(servicio.cargar('P', cambio(L1, V1), DESPUES)).rejects.toThrow(
      BadRequestException,
    );
    await servicio.cargar('P', cambio(L1, L2), DESPUES);
    expect(repositorio.guardado?.eventos[0].inscripcionJugadorEntraId).toBe(L2);
  });

  it('solo un cambio lleva jugador que entra', async () => {
    // Act y Assert
    await expect(
      servicio.cargar(
        'P',
        jugado([
          {
            tipoEvento: TipoEvento.Gol,
            minuto: 5,
            inscripcionJugadorId: L1,
            inscripcionJugadorEntraId: L2,
          },
        ]),
        DESPUES,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('un W.O. es 3 a 0 para el que se presentó y no lleva jugadores', async () => {
    // Act
    await servicio.cargar(
      'P',
      { estadoPartido: EstadoPartido.WO, equipoGanadorId: VISITANTE },
      DESPUES,
    );

    // Assert
    expect(repositorio.guardado).toMatchObject({
      golesLocal: 0,
      golesVisitante: 3,
      jugadores: [],
    });
    await expect(
      servicio.cargar('P', { estadoPartido: EstadoPartido.WO }, DESPUES),
    ).rejects.toThrow(BadRequestException);
    await expect(
      servicio.cargar(
        'P',
        { estadoPartido: EstadoPartido.WO, equipoGanadorId: 99 },
        DESPUES,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('un suspendido no tiene marcador ni jugadores, y se puede cargar antes de la hora', async () => {
    // Act
    await servicio.cargar(
      'P',
      { estadoPartido: EstadoPartido.Suspendido },
      new Date('2026-11-01T00:00:00Z'),
    );

    // Assert
    expect(repositorio.guardado).toMatchObject({
      golesLocal: null,
      golesVisitante: null,
    });
    await expect(
      servicio.cargar(
        'P',
        { estadoPartido: EstadoPartido.Suspendido, jugadores: [L1] },
        DESPUES,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('un jugado necesita día y hora, y que el partido ya haya empezado', async () => {
    // Act y Assert
    await expect(
      servicio.cargar('P', jugado(), new Date('2026-11-21T20:59:00Z')),
    ).rejects.toThrow(/todavía no empezó/);

    repositorio.fechaHora = null;
    await expect(servicio.cargar('P', jugado(), DESPUES)).rejects.toThrow(
      /programar el día y hora/,
    );
  });

  it('no cambia resultados de un torneo finalizado', async () => {
    // Arrange
    repositorio.estadoTorneo = EstadoTorneo.Finalizado;

    // Act y Assert
    await expect(servicio.cargar('P', jugado(), DESPUES)).rejects.toThrow(
      ConflictException,
    );
  });

  it('anula un resultado cargado, pero no uno sin cargar', async () => {
    // Act y Assert
    await expect(servicio.anular('P')).rejects.toThrow(
      'El partido no tiene resultado cargado.',
    );
    await servicio.cargar('P', jugado(), DESPUES);
    await servicio.anular('P');
    expect(repositorio.anulado).toBe(true);
  });
});

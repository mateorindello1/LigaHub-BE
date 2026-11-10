import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import type { InscripcionesEquipoService } from '../inscripciones-equipo/inscripciones-equipo.service.js';
import type { JugadoresService } from '../jugadores/jugadores.service.js';
import { EstadoTorneo } from '../torneos/estado-torneo.enum.js';
import type { TorneosService } from '../torneos/torneos.service.js';
import type {
  DatosInscripcionJugador,
  InscripcionJugadorConJugador,
  InscripcionesJugadorRepository,
} from './inscripciones-jugador.repository.js';
import { InscripcionesJugadorService } from './inscripciones-jugador.service.js';

const TORNEO = 1;
const EQUIPO_A = 'inscripcion-equipo-a';
const EQUIPO_B = 'inscripcion-equipo-b';

/** Repositorio falso en memoria. Replica la transferencia de la capitanía que hace el real. */
class RepositorioEnMemoria {
  inscripciones: InscripcionJugadorConJugador[] = [];
  /** Ids de las inscripciones que ya jugaron partidos. */
  conPartidos = new Set<string>();
  private proximoId = 1;

  obtenerPorInscripcionEquipo(inscripcionEquipoId: string) {
    return Promise.resolve(
      this.inscripciones.filter(
        (i) => i.inscripcionEquipoId === inscripcionEquipoId,
      ),
    );
  }
  obtenerPorId(inscripcionEquipoId: string, id: string) {
    return Promise.resolve(
      this.inscripciones.find(
        (i) => i.id === id && i.inscripcionEquipoId === inscripcionEquipoId,
      ) ?? null,
    );
  }
  equipoDelJugadorEnTorneo(_torneoId: number, jugadorId: number) {
    const inscripcion = this.inscripciones.find(
      (i) => i.jugadorId === jugadorId,
    );
    return Promise.resolve(
      inscripcion ? inscripcion.inscripcionEquipoId : null,
    );
  }
  jugadorConDorsal(
    inscripcionEquipoId: string,
    dorsal: number,
    excluirId?: string,
  ) {
    const inscripcion = this.inscripciones.find(
      (i) =>
        i.inscripcionEquipoId === inscripcionEquipoId &&
        i.dorsal === dorsal &&
        i.id !== excluirId,
    );
    return Promise.resolve(inscripcion ? inscripcion.jugador.nombres : null);
  }
  crear(
    inscripcionEquipoId: string,
    jugadorId: number,
    datos: DatosInscripcionJugador,
  ) {
    this.quitarCapitania(inscripcionEquipoId, datos);
    const inscripcion: InscripcionJugadorConJugador = {
      id: `inscripcion-${this.proximoId++}`,
      inscripcionEquipoId,
      jugadorId,
      ...datos,
      jugador: {
        id: jugadorId,
        nombres: `Jugador ${jugadorId}`,
        apellidos: '',
      },
    };
    this.inscripciones.push(inscripcion);
    return Promise.resolve(inscripcion);
  }
  modificar(
    inscripcionEquipoId: string,
    id: string,
    datos: DatosInscripcionJugador,
  ) {
    this.quitarCapitania(inscripcionEquipoId, datos);
    const inscripcion = this.inscripciones.find((i) => i.id === id)!;
    Object.assign(inscripcion, datos);
    return Promise.resolve(inscripcion);
  }
  borrar(id: string) {
    this.inscripciones = this.inscripciones.filter((i) => i.id !== id);
    return Promise.resolve();
  }
  jugoPartidos(id: string) {
    return Promise.resolve(this.conPartidos.has(id));
  }
  private quitarCapitania(
    inscripcionEquipoId: string,
    datos: DatosInscripcionJugador,
  ) {
    if (!datos.capitan) return;
    this.inscripciones
      .filter((i) => i.inscripcionEquipoId === inscripcionEquipoId)
      .forEach((i) => (i.capitan = false));
  }
}

describe('InscripcionesJugadorService', () => {
  let repositorio: RepositorioEnMemoria;
  let servicio: InscripcionesJugadorService;
  let estadoTorneo: EstadoTorneo;

  beforeEach(() => {
    // Arrange: un torneo en curso con dos equipos inscriptos y los jugadores 1 a 9.
    repositorio = new RepositorioEnMemoria();
    estadoTorneo = EstadoTorneo.EnCurso;
    const torneos = {
      obtenerPorId: () =>
        Promise.resolve({ id: TORNEO, nombre: 'Apertura', estadoTorneo }),
    };
    const inscripcionesEquipo = {
      obtenerPorId: (_torneoId: number, id: string) =>
        [EQUIPO_A, EQUIPO_B].includes(id)
          ? Promise.resolve({ id })
          : Promise.reject(new NotFoundException()),
    };
    const jugadores = {
      obtenerPorId: (id: number) =>
        id < 10
          ? Promise.resolve({ id, nombres: 'Jugador', apellidos: `${id}` })
          : Promise.reject(new NotFoundException()),
    };
    servicio = new InscripcionesJugadorService(
      repositorio as unknown as InscripcionesJugadorRepository,
      torneos as unknown as TorneosService,
      inscripcionesEquipo as unknown as InscripcionesEquipoService,
      jugadores as unknown as JugadoresService,
    );
  });

  it('inscribe un jugador; por defecto no es capitán', async () => {
    // Act
    const inscripcion = await servicio.crear(TORNEO, EQUIPO_A, {
      jugadorId: 1,
      dorsal: 10,
    });

    // Assert
    expect(inscripcion).toMatchObject({
      jugadorId: 1,
      dorsal: 10,
      capitan: false,
    });
  });

  it('no inscribe a un jugador que ya está en otro equipo del torneo', async () => {
    // Arrange
    await servicio.crear(TORNEO, EQUIPO_A, { jugadorId: 1, dorsal: 10 });

    // Act y Assert
    await expect(
      servicio.crear(TORNEO, EQUIPO_B, { jugadorId: 1, dorsal: 5 }),
    ).rejects.toThrow(/ya está inscripto/);
  });

  it('no repite un dorsal en el equipo, pero sí en otro equipo', async () => {
    // Arrange
    await servicio.crear(TORNEO, EQUIPO_A, { jugadorId: 1, dorsal: 10 });

    // Act y Assert
    await expect(
      servicio.crear(TORNEO, EQUIPO_A, { jugadorId: 2, dorsal: 10 }),
    ).rejects.toThrow('El dorsal 10 ya lo usa');
    await expect(
      servicio.crear(TORNEO, EQUIPO_B, { jugadorId: 2, dorsal: 10 }),
    ).resolves.toMatchObject({ dorsal: 10 });
  });

  it('al marcar un capitán nuevo, el anterior deja de serlo', async () => {
    // Arrange
    const primero = await servicio.crear(TORNEO, EQUIPO_A, {
      jugadorId: 1,
      dorsal: 10,
      capitan: true,
    });
    const segundo = await servicio.crear(TORNEO, EQUIPO_A, {
      jugadorId: 2,
      dorsal: 5,
    });

    // Act
    await servicio.modificar(TORNEO, EQUIPO_A, segundo.id, { capitan: true });

    // Assert
    const plantel = await servicio.obtenerPorInscripcionEquipo(
      TORNEO,
      EQUIPO_A,
    );
    expect(plantel.filter((i) => i.capitan).map((i) => i.id)).toEqual([
      segundo.id,
    ]);
    expect(plantel.find((i) => i.id === primero.id)?.capitan).toBe(false);
  });

  it('modificar sin cambiar el dorsal no lo toma como repetido', async () => {
    // Arrange
    const inscripcion = await servicio.crear(TORNEO, EQUIPO_A, {
      jugadorId: 1,
      dorsal: 10,
    });

    // Act
    const modificada = await servicio.modificar(
      TORNEO,
      EQUIPO_A,
      inscripcion.id,
      {
        dorsal: 10,
        capitan: true,
      },
    );

    // Assert
    expect(modificada).toMatchObject({ dorsal: 10, capitan: true });
  });

  it('no modifica planteles de un torneo finalizado', async () => {
    // Arrange
    estadoTorneo = EstadoTorneo.Finalizado;

    // Act y Assert
    await expect(
      servicio.crear(TORNEO, EQUIPO_A, { jugadorId: 1, dorsal: 10 }),
    ).rejects.toThrow(ConflictException);
  });

  it('no da de baja a un jugador que ya jugó partidos', async () => {
    // Arrange
    const jugo = await servicio.crear(TORNEO, EQUIPO_A, {
      jugadorId: 1,
      dorsal: 10,
    });
    const noJugo = await servicio.crear(TORNEO, EQUIPO_A, {
      jugadorId: 2,
      dorsal: 5,
    });
    repositorio.conPartidos.add(jugo.id);

    // Act y Assert
    await expect(servicio.borrar(TORNEO, EQUIPO_A, jugo.id)).rejects.toThrow(
      /ya jugó partidos/,
    );
    await servicio.borrar(TORNEO, EQUIPO_A, noJugo.id);
    expect(await repositorio.obtenerPorId(EQUIPO_A, noJugo.id)).toBeNull();
  });

  it('responde 404 si la inscripción del jugador no es de ese equipo', async () => {
    // Arrange
    const inscripcion = await servicio.crear(TORNEO, EQUIPO_A, {
      jugadorId: 1,
      dorsal: 10,
    });

    // Act y Assert
    await expect(
      servicio.obtenerPorId(TORNEO, EQUIPO_B, inscripcion.id),
    ).rejects.toThrow(NotFoundException);
  });
});

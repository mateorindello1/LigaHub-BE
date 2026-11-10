import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { EstadoTorneo } from '../torneos/estado-torneo.enum.js';
import { EstadoPartido } from './estado-partido.enum.js';
import type {
  DatosProgramacion,
  PartidoParaProgramar,
  PartidosRepository,
} from './partidos.repository.js';
import { PartidosService } from './partidos.service.js';

/** Las 18:00 del 21/11/2026 en Argentina (UTC-3). */
const SABADO_18 = '2026-11-21T18:00:00-03:00';
const SABADO_18_30 = '2026-11-21T18:30:00-03:00';
const SABADO_19 = '2026-11-21T19:00:00-03:00';

const CANCHAS = [
  { id: 1, numero: 1, predio: { id: 1, nombre: 'Parque Norte' } },
  { id: 2, numero: 2, predio: { id: 1, nombre: 'Parque Norte' } },
];

/** Repositorio falso en memoria. Busca conflictos igual que el real: inicio dentro del rango. */
class RepositorioEnMemoria {
  partidos: PartidoParaProgramar[] = [];
  estadoTorneo: number = EstadoTorneo.EnCurso;

  agregar(id: string, localId: number, visitanteId: number) {
    this.partidos.push({
      id,
      estadoPartido: EstadoPartido.Programado,
      fechaHoraPartido: null,
      canchaId: null,
      equipoLocal: { id: localId, nombre: `Equipo ${localId}` },
      equipoVisitante: { id: visitanteId, nombre: `Equipo ${visitanteId}` },
      fechaFixture: { torneo: { nombre: 'Apertura', estadoTorneo: 0 } },
      cancha: null,
    });
  }
  obtenerPorId(id: string) {
    const partido = this.partidos.find((p) => p.id === id);
    if (partido) partido.fechaFixture.torneo.estadoTorneo = this.estadoTorneo;
    return Promise.resolve(partido ?? null);
  }
  obtenerCancha(id: number) {
    return Promise.resolve(CANCHAS.find((c) => c.id === id) ?? null);
  }
  partidoEnCancha(canchaId: number, desde: Date, hasta: Date, excluir: string) {
    return this.buscar((p) => p.canchaId === canchaId, desde, hasta, excluir);
  }
  partidoDeEquipos(ids: number[], desde: Date, hasta: Date, excluir: string) {
    return this.buscar(
      (p) =>
        ids.includes(p.equipoLocal.id) || ids.includes(p.equipoVisitante.id),
      desde,
      hasta,
      excluir,
    );
  }
  programar(id: string, datos: DatosProgramacion) {
    const partido = this.partidos.find((p) => p.id === id)!;
    partido.fechaHoraPartido = datos.fechaHoraPartido;
    partido.canchaId = datos.canchaId;
    partido.estadoPartido = datos.estadoPartido;
    const cancha = CANCHAS.find((c) => c.id === datos.canchaId);
    partido.cancha = cancha ?? null;
    return Promise.resolve(partido);
  }
  private buscar(
    filtro: (p: PartidoParaProgramar) => boolean,
    desde: Date,
    hasta: Date,
    excluir: string,
  ) {
    const partido = this.partidos.find(
      (p) =>
        p.id !== excluir &&
        filtro(p) &&
        p.estadoPartido !== (EstadoPartido.Suspendido as number) &&
        p.fechaHoraPartido !== null &&
        p.fechaHoraPartido > desde &&
        p.fechaHoraPartido < hasta,
    );
    return Promise.resolve(
      partido
        ? {
            local: partido.equipoLocal.nombre,
            visitante: partido.equipoVisitante.nombre,
            fechaHora: partido.fechaHoraPartido!,
          }
        : null,
    );
  }
}

describe('PartidosService', () => {
  let repositorio: RepositorioEnMemoria;
  let servicio: PartidosService;

  beforeEach(() => {
    // Arrange: tres partidos sin programar. A (equipos 1 y 2), B (3 y 4) y C (1 y 5).
    repositorio = new RepositorioEnMemoria();
    repositorio.agregar('A', 1, 2);
    repositorio.agregar('B', 3, 4);
    repositorio.agregar('C', 1, 5);
    servicio = new PartidosService(
      repositorio as unknown as PartidosRepository,
    );
  });

  it('asigna cancha y día y hora', async () => {
    // Act
    const programado = await servicio.programar('A', {
      fechaHora: SABADO_18,
      canchaId: 1,
    });

    // Assert
    expect(programado.fechaHora).toEqual(new Date(SABADO_18));
    expect(programado.cancha).toEqual({
      id: 1,
      numero: 1,
      predioId: 1,
      predio: 'Parque Norte',
    });
  });

  it('solo cambia lo que viene en el pedido y null deja el dato a confirmar', async () => {
    // Arrange
    await servicio.programar('A', { fechaHora: SABADO_18, canchaId: 1 });

    // Act
    const sinCancha = await servicio.programar('A', { canchaId: null });

    // Assert
    expect(sinCancha.cancha).toBeNull();
    expect(sinCancha.fechaHora).toEqual(new Date(SABADO_18));
  });

  it('no superpone dos partidos en la misma cancha', async () => {
    // Arrange
    await servicio.programar('A', { fechaHora: SABADO_18, canchaId: 1 });

    // Act y Assert: media hora después en la misma cancha, no; en la otra cancha, sí.
    await expect(
      servicio.programar('B', { fechaHora: SABADO_18_30, canchaId: 1 }),
    ).rejects.toThrow(/La cancha 1 de Parque Norte está ocupada/);
    await expect(
      servicio.programar('B', { fechaHora: SABADO_18_30, canchaId: 2 }),
    ).resolves.toMatchObject({ cancha: { numero: 2 } });
  });

  it('una hora después en la misma cancha no se superpone', async () => {
    // Arrange
    await servicio.programar('A', { fechaHora: SABADO_18, canchaId: 1 });

    // Act
    const siguiente = await servicio.programar('B', {
      fechaHora: SABADO_19,
      canchaId: 1,
    });

    // Assert
    expect(siguiente.fechaHora).toEqual(new Date(SABADO_19));
  });

  it('un equipo no juega dos partidos superpuestos, aunque sea en otra cancha', async () => {
    // Arrange: A y C comparten el equipo 1.
    await servicio.programar('A', { fechaHora: SABADO_18, canchaId: 1 });

    // Act y Assert
    await expect(
      servicio.programar('C', { fechaHora: SABADO_18_30, canchaId: 2 }),
    ).rejects.toThrow(/Uno de los equipos ya juega a esa hora/);
  });

  it('no reprograma un partido jugado ni uno de un torneo finalizado', async () => {
    // Arrange
    repositorio.partidos[0].estadoPartido = EstadoPartido.Finalizado;

    // Act y Assert
    await expect(
      servicio.programar('A', { fechaHora: SABADO_18 }),
    ).rejects.toThrow('El partido ya se jugó: no se puede reprogramar.');

    repositorio.estadoTorneo = EstadoTorneo.Finalizado;
    await expect(
      servicio.programar('B', { fechaHora: SABADO_18 }),
    ).rejects.toThrow(ConflictException);
  });

  it('un suspendido con día y hora nuevos vuelve a Programado', async () => {
    // Arrange
    repositorio.partidos[1].estadoPartido = EstadoPartido.Suspendido;

    // Act
    const reprogramado = await servicio.programar('B', {
      fechaHora: SABADO_18,
    });

    // Assert
    expect(reprogramado.estadoPartido).toBe(EstadoPartido.Programado);
  });

  it('un suspendido no ocupa el horario', async () => {
    // Arrange
    await servicio.programar('A', { fechaHora: SABADO_18, canchaId: 1 });
    repositorio.partidos[0].estadoPartido = EstadoPartido.Suspendido;

    // Act y Assert
    await expect(
      servicio.programar('B', { fechaHora: SABADO_18, canchaId: 1 }),
    ).resolves.toMatchObject({ cancha: { id: 1 } });
  });

  it('responde 404 si el partido o la cancha no existen', async () => {
    // Act y Assert
    await expect(
      servicio.programar('Z', { fechaHora: SABADO_18 }),
    ).rejects.toThrow(NotFoundException);
    await expect(servicio.programar('A', { canchaId: 99 })).rejects.toThrow(
      'No existe la cancha 99.',
    );
  });
});

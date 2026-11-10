import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import type { EquiposService } from '../equipos/equipos.service.js';
import { EstadoTorneo } from '../torneos/estado-torneo.enum.js';
import type { TorneosService } from '../torneos/torneos.service.js';
import type {
  InscripcionEquipoConEquipo,
  InscripcionesEquipoRepository,
} from './inscripciones-equipo.repository.js';
import { InscripcionesEquipoService } from './inscripciones-equipo.service.js';

const TORNEO = 1;

/** Repositorio falso en memoria. */
class RepositorioEnMemoria {
  inscripciones: InscripcionEquipoConEquipo[] = [];
  /** Ids de las inscripciones con jugadores. */
  conJugadores = new Set<string>();
  private proximoId = 1;

  obtenerPorId(torneoId: number, id: string) {
    return Promise.resolve(
      this.inscripciones.find((i) => i.id === id && i.torneoId === torneoId) ??
        null,
    );
  }
  existe(torneoId: number, equipoId: number, excluirId?: string) {
    return Promise.resolve(
      this.inscripciones.some(
        (i) =>
          i.torneoId === torneoId &&
          i.equipoId === equipoId &&
          i.id !== excluirId,
      ),
    );
  }
  crear(torneoId: number, equipoId: number) {
    const inscripcion = {
      id: `i${this.proximoId++}`,
      torneoId,
      equipoId,
      equipo: { id: equipoId, nombre: `Equipo ${equipoId}`, escudoURL: null },
    };
    this.inscripciones.push(inscripcion);
    return Promise.resolve(inscripcion);
  }
  modificar(id: string, equipoId: number) {
    const inscripcion = this.inscripciones.find((i) => i.id === id)!;
    inscripcion.equipoId = equipoId;
    return Promise.resolve(inscripcion);
  }
  borrar(id: string) {
    this.inscripciones = this.inscripciones.filter((i) => i.id !== id);
    return Promise.resolve();
  }
  tieneJugadores(id: string) {
    return Promise.resolve(this.conJugadores.has(id));
  }
}

describe('InscripcionesEquipoService', () => {
  let repositorio: RepositorioEnMemoria;
  let servicio: InscripcionesEquipoService;
  let estadoTorneo: EstadoTorneo;

  beforeEach(() => {
    // Arrange: un torneo con las inscripciones abiertas y los equipos 1 a 9.
    repositorio = new RepositorioEnMemoria();
    estadoTorneo = EstadoTorneo.Inscripcion;
    const torneos = {
      obtenerPorId: (id: number) =>
        id === TORNEO
          ? Promise.resolve({ id, nombre: 'Clausura', estadoTorneo })
          : Promise.reject(new NotFoundException()),
    };
    const equipos = {
      obtenerPorId: (id: number) =>
        id < 10
          ? Promise.resolve({ id, nombre: `Equipo ${id}` })
          : Promise.reject(new NotFoundException(`No existe el equipo ${id}.`)),
    };
    servicio = new InscripcionesEquipoService(
      repositorio as unknown as InscripcionesEquipoRepository,
      torneos as unknown as TorneosService,
      equipos as unknown as EquiposService,
    );
  });

  it('inscribe un equipo en un torneo con las inscripciones abiertas', async () => {
    // Act
    const inscripcion = await servicio.crear(TORNEO, { equipoId: 3 });

    // Assert
    expect(inscripcion).toMatchObject({ torneoId: TORNEO, equipoId: 3 });
  });

  it('no inscribe dos veces al mismo equipo', async () => {
    // Arrange
    await servicio.crear(TORNEO, { equipoId: 3 });

    // Act y Assert
    await expect(servicio.crear(TORNEO, { equipoId: 3 })).rejects.toThrow(
      'El equipo "Equipo 3" ya está inscripto en este torneo.',
    );
  });

  it('con el torneo en curso las inscripciones están cerradas', async () => {
    // Arrange
    estadoTorneo = EstadoTorneo.EnCurso;

    // Act y Assert
    await expect(servicio.crear(TORNEO, { equipoId: 3 })).rejects.toThrow(
      /están cerradas/,
    );
  });

  it('responde 404 si el equipo no existe o la inscripción no es de ese torneo', async () => {
    // Act y Assert
    await expect(servicio.crear(TORNEO, { equipoId: 99 })).rejects.toThrow(
      'No existe el equipo 99.',
    );
    await expect(servicio.obtenerPorId(TORNEO, 'otra')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('cambia el equipo de una inscripción, sin chocar consigo misma', async () => {
    // Arrange
    const inscripcion = await servicio.crear(TORNEO, { equipoId: 3 });

    // Act
    const modificada = await servicio.modificar(TORNEO, inscripcion.id, {
      equipoId: 4,
    });

    // Assert
    expect(modificada.equipoId).toBe(4);
  });

  it('no da de baja una inscripción con jugadores', async () => {
    // Arrange
    const inscripcion = await servicio.crear(TORNEO, { equipoId: 3 });
    repositorio.conJugadores.add(inscripcion.id);

    // Act y Assert
    await expect(servicio.borrar(TORNEO, inscripcion.id)).rejects.toThrow(
      ConflictException,
    );
  });
});

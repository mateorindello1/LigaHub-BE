import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Prisma, Torneo } from '../../generated/prisma/client.js';
import { EstadoTorneo } from './estado-torneo.enum.js';
import type { TorneosRepository } from './torneos.repository.js';
import { TorneosService } from './torneos.service.js';

/** Repositorio falso en memoria: lo justo para probar las reglas del servicio. */
class RepositorioEnMemoria {
  torneos: Torneo[] = [];
  /** Ids de los torneos con inscripciones o fixture. */
  conDatos = new Set<number>();
  private proximoId = 1;

  obtenerTodos() {
    return Promise.resolve(this.torneos);
  }
  obtenerPorId(id: number) {
    return Promise.resolve(this.torneos.find((t) => t.id === id) ?? null);
  }
  crear(datos: Prisma.TorneoCreateInput) {
    const torneo = { ...datos, id: this.proximoId++ } as Torneo;
    this.torneos.push(torneo);
    return Promise.resolve(torneo);
  }
  modificar(id: number, datos: Prisma.TorneoUpdateInput) {
    const torneo = this.torneos.find((t) => t.id === id)!;
    // Como Prisma: los campos undefined no se tocan.
    for (const [campo, valor] of Object.entries(datos)) {
      if (valor !== undefined) Object.assign(torneo, { [campo]: valor });
    }
    return Promise.resolve(torneo);
  }
  borrar(id: number) {
    this.torneos = this.torneos.filter((t) => t.id !== id);
    return Promise.resolve();
  }
  tieneDatosAsociados(id: number) {
    return Promise.resolve(this.conDatos.has(id));
  }
}

describe('TorneosService', () => {
  let repositorio: RepositorioEnMemoria;
  let servicio: TorneosService;

  beforeEach(() => {
    repositorio = new RepositorioEnMemoria();
    servicio = new TorneosService(repositorio as unknown as TorneosRepository);
  });

  it('todo torneo nace en estado Inscripción', async () => {
    // Act
    const torneo = await servicio.crear({ nombre: 'Apertura', anio: 2026 });

    // Assert
    expect(torneo.estadoTorneo).toBe(EstadoTorneo.Inscripcion);
  });

  it('modificar cambia solo lo que se envía y no toca el estado', async () => {
    // Arrange
    const torneo = await servicio.crear({ nombre: 'Apertura', anio: 2026 });

    // Act
    const modificado = await servicio.modificar(torneo.id, {
      nombre: 'Apertura 2026',
    });

    // Assert
    expect(modificado).toMatchObject({
      nombre: 'Apertura 2026',
      anio: 2026,
      estadoTorneo: EstadoTorneo.Inscripcion,
    });
  });

  it('responde 404 si el torneo no existe', async () => {
    // Act y Assert
    await expect(servicio.obtenerPorId(99)).rejects.toThrow(
      'No existe el torneo 99.',
    );
    await expect(servicio.modificar(99, { anio: 2027 })).rejects.toThrow(
      NotFoundException,
    );
    await expect(servicio.borrar(99)).rejects.toThrow(NotFoundException);
  });

  it('no borra un torneo con inscripciones o fixture, y sí uno sin datos', async () => {
    // Arrange
    const conDatos = await servicio.crear({ nombre: 'Apertura', anio: 2026 });
    const sinDatos = await servicio.crear({ nombre: 'Clausura', anio: 2026 });
    repositorio.conDatos.add(conDatos.id);

    // Act y Assert
    await expect(servicio.borrar(conDatos.id)).rejects.toThrow(
      ConflictException,
    );
    await servicio.borrar(sinDatos.id);
    expect(await servicio.obtenerTodos()).toEqual([conDatos]);
  });
});

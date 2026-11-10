import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Cancha } from '../../generated/prisma/client.js';
import { PrediosService } from '../predios/predios.service.js';
import type {
  PredioConCanchas,
  PrediosRepository,
} from '../predios/predios.repository.js';
import type { CanchasRepository } from './canchas.repository.js';
import { CanchasService } from './canchas.service.js';

/** Repositorio falso de predios: guarda las canchas en el propio predio, como lo devuelve el real. */
class PrediosEnMemoria {
  predios: PredioConCanchas[] = [];
  private proximoId = 1;

  obtenerPorId(id: number) {
    return Promise.resolve(this.predios.find((p) => p.id === id) ?? null);
  }
  existeConNombre(nombre: string, excluirId?: number) {
    return Promise.resolve(
      this.predios.some(
        (p) =>
          p.nombre.toLowerCase() === nombre.toLowerCase() && p.id !== excluirId,
      ),
    );
  }
  crear(datos: { nombre: string; direccion: string }) {
    const predio = { ...datos, id: this.proximoId++, canchas: [] };
    this.predios.push(predio);
    return Promise.resolve(predio);
  }
  borrar(id: number) {
    this.predios = this.predios.filter((p) => p.id !== id);
    return Promise.resolve();
  }
}

/** Repositorio falso de canchas, que además actualiza las canchas de cada predio. */
class CanchasEnMemoria {
  canchas: Cancha[] = [];
  /** Partidos asignados a cada cancha (por id). */
  partidos = new Map<number, number>();
  private proximoId = 1;

  constructor(private readonly predios: PrediosEnMemoria) {}

  obtenerPorId(predioId: number, id: number) {
    return Promise.resolve(
      this.canchas.find((c) => c.id === id && c.predioId === predioId) ?? null,
    );
  }
  existeConNumero(predioId: number, numero: number, excluirId?: number) {
    return Promise.resolve(
      this.canchas.some(
        (c) =>
          c.predioId === predioId && c.numero === numero && c.id !== excluirId,
      ),
    );
  }
  crear(predioId: number, datos: { numero: number; descripcion: string }) {
    const cancha = { ...datos, id: this.proximoId++, predioId };
    this.canchas.push(cancha);
    this.predios.predios.find((p) => p.id === predioId)!.canchas.push(cancha);
    return Promise.resolve(cancha);
  }
  modificar(id: number, datos: Partial<Cancha>) {
    const cancha = this.canchas.find((c) => c.id === id)!;
    if (datos.numero !== undefined) cancha.numero = datos.numero;
    return Promise.resolve(cancha);
  }
  borrar(id: number) {
    this.canchas = this.canchas.filter((c) => c.id !== id);
    for (const predio of this.predios.predios) {
      predio.canchas = predio.canchas.filter((c) => c.id !== id);
    }
    return Promise.resolve();
  }
  contarPartidos(id: number) {
    return Promise.resolve(this.partidos.get(id) ?? 0);
  }
}

describe('Predios y canchas', () => {
  let predios: PrediosService;
  let canchas: CanchasService;
  let repositorioCanchas: CanchasEnMemoria;
  let idPredio: number;

  beforeEach(async () => {
    // Arrange: un predio sin canchas.
    const repositorioPredios = new PrediosEnMemoria();
    repositorioCanchas = new CanchasEnMemoria(repositorioPredios);
    predios = new PrediosService(
      repositorioPredios as unknown as PrediosRepository,
    );
    canchas = new CanchasService(
      repositorioCanchas as unknown as CanchasRepository,
      predios,
    );
    idPredio = (
      await predios.crear({ nombre: 'Parque Norte', direccion: 'Mitre 100' })
    ).id;
  });

  it('no repite el nombre del predio (sin importar mayúsculas)', async () => {
    // Act y Assert
    await expect(
      predios.crear({ nombre: 'parque norte', direccion: 'Otra 1' }),
    ).rejects.toThrow(ConflictException);
  });

  it('no repite el número de cancha en el predio, pero sí en otro', async () => {
    // Arrange
    await canchas.crear(idPredio, { numero: 1, descripcion: 'Fútbol 7' });
    const otro = await predios.crear({ nombre: 'Sur', direccion: 'Sur 1' });

    // Act y Assert
    await expect(
      canchas.crear(idPredio, { numero: 1, descripcion: 'Fútbol 5' }),
    ).rejects.toThrow('El predio ya tiene una cancha número 1.');
    await expect(
      canchas.crear(otro.id, { numero: 1, descripcion: 'Fútbol 5' }),
    ).resolves.toMatchObject({ numero: 1 });
  });

  it('una cancha de otro predio responde 404', async () => {
    // Arrange
    const cancha = await canchas.crear(idPredio, {
      numero: 1,
      descripcion: 'Fútbol 7',
    });
    const otro = await predios.crear({ nombre: 'Sur', direccion: 'Sur 1' });

    // Act y Assert
    await expect(canchas.obtenerPorId(otro.id, cancha.id)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('no borra una cancha con partidos ni un predio con canchas', async () => {
    // Arrange
    const cancha = await canchas.crear(idPredio, {
      numero: 1,
      descripcion: 'Fútbol 7',
    });
    repositorioCanchas.partidos.set(cancha.id, 3);

    // Act y Assert
    await expect(canchas.borrar(idPredio, cancha.id)).rejects.toThrow(
      /tiene 3 partidos asignados/,
    );
    await expect(predios.borrar(idPredio)).rejects.toThrow(/tiene canchas/);

    // Sin partidos, se borra la cancha y después el predio.
    repositorioCanchas.partidos.delete(cancha.id);
    await canchas.borrar(idPredio, cancha.id);
    await predios.borrar(idPredio);
    await expect(predios.obtenerPorId(idPredio)).rejects.toThrow(
      NotFoundException,
    );
  });
});

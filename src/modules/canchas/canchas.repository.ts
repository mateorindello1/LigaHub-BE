import { Injectable } from '@nestjs/common';
import type { Cancha, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/** Acceso a datos de canchas. Es la única capa que usa Prisma directamente. */
@Injectable()
export class CanchasRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Devuelve las canchas del predio, por número. */
  obtenerPorPredio(predioId: number): Promise<Cancha[]> {
    return this.prisma.cancha.findMany({
      where: { predioId },
      orderBy: { numero: 'asc' },
    });
  }

  /** Devuelve la cancha dentro del predio, o null si no existe en ese predio. */
  obtenerPorId(predioId: number, id: number): Promise<Cancha | null> {
    return this.prisma.cancha.findFirst({ where: { id, predioId } });
  }

  /**
   * Indica si el predio ya tiene otra cancha con ese número.
   * @param excluirId cancha que se está modificando, para no compararla consigo misma.
   */
  async existeConNumero(
    predioId: number,
    numero: number,
    excluirId?: number,
  ): Promise<boolean> {
    const cantidad = await this.prisma.cancha.count({
      where: {
        predioId,
        numero,
        ...(excluirId !== undefined && { id: { not: excluirId } }),
      },
    });
    return cantidad > 0;
  }

  /** Inserta una cancha en el predio y la devuelve. */
  crear(
    predioId: number,
    datos: Omit<Prisma.CanchaUncheckedCreateInput, 'predioId'>,
  ): Promise<Cancha> {
    return this.prisma.cancha.create({ data: { ...datos, predioId } });
  }

  /** Actualiza los campos recibidos y devuelve la cancha modificada. */
  modificar(id: number, datos: Prisma.CanchaUpdateInput): Promise<Cancha> {
    return this.prisma.cancha.update({ where: { id }, data: datos });
  }

  /** Elimina la cancha. */
  async borrar(id: number): Promise<void> {
    await this.prisma.cancha.delete({ where: { id } });
  }

  /** Cantidad de partidos que tienen asignada la cancha. */
  contarPartidos(id: number): Promise<number> {
    return this.prisma.partido.count({ where: { canchaId: id } });
  }
}

import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/** Campos de cada predio, con sus canchas por número. */
const CAMPOS_PREDIO = {
  id: true,
  nombre: true,
  direccion: true,
  canchas: {
    select: { id: true, numero: true, descripcion: true },
    orderBy: { numero: 'asc' },
  },
} satisfies Prisma.PredioSelect;

/**
 * Predio tal como lo devuelve la API: sus datos y sus canchas. Así una sola consulta sirve para
 * la grilla de predios y para elegir una cancha al programar un partido.
 */
export type PredioConCanchas = Prisma.PredioGetPayload<{
  select: typeof CAMPOS_PREDIO;
}>;

/** Acceso a datos de predios. Es la única capa que usa Prisma directamente. */
@Injectable()
export class PrediosRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Devuelve todos los predios por nombre, con sus canchas. */
  obtenerTodos(): Promise<PredioConCanchas[]> {
    return this.prisma.predio.findMany({
      select: CAMPOS_PREDIO,
      orderBy: { nombre: 'asc' },
    });
  }

  /** Devuelve el predio con sus canchas, o null si no existe. */
  obtenerPorId(id: number): Promise<PredioConCanchas | null> {
    return this.prisma.predio.findUnique({
      where: { id },
      select: CAMPOS_PREDIO,
    });
  }

  /**
   * Indica si ya existe otro predio con ese nombre (sin distinguir mayúsculas, por la intercalación).
   * @param excluirId id del predio que se está modificando, para no compararlo consigo mismo.
   */
  async existeConNombre(nombre: string, excluirId?: number): Promise<boolean> {
    const cantidad = await this.prisma.predio.count({
      where: {
        nombre,
        ...(excluirId !== undefined && { id: { not: excluirId } }),
      },
    });
    return cantidad > 0;
  }

  /** Inserta un predio y lo devuelve (sin canchas todavía). */
  crear(datos: Prisma.PredioCreateInput): Promise<PredioConCanchas> {
    return this.prisma.predio.create({ data: datos, select: CAMPOS_PREDIO });
  }

  /** Actualiza los campos recibidos y devuelve el predio modificado. */
  modificar(
    id: number,
    datos: Prisma.PredioUpdateInput,
  ): Promise<PredioConCanchas> {
    return this.prisma.predio.update({
      where: { id },
      data: datos,
      select: CAMPOS_PREDIO,
    });
  }

  /** Elimina el predio. */
  async borrar(id: number): Promise<void> {
    await this.prisma.predio.delete({ where: { id } });
  }
}

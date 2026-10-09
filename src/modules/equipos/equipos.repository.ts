import { Injectable } from '@nestjs/common';
import type { Equipo, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/** Acceso a datos de equipos. Es la única capa que usa Prisma directamente. */
@Injectable()
export class EquiposRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Devuelve todos los equipos, ordenados por nombre. */
  obtenerTodos(): Promise<Equipo[]> {
    return this.prisma.equipo.findMany({ orderBy: { nombre: 'asc' } });
  }

  /** Devuelve el equipo con ese id, o null si no existe. */
  obtenerPorId(id: number): Promise<Equipo | null> {
    return this.prisma.equipo.findUnique({ where: { id } });
  }

  /**
   * Indica si ya existe otro equipo con ese nombre.
   * La comparación no distingue mayúsculas porque usa la intercalación de SQL Server.
   * @param excluirId id del equipo que se está modificando, para no compararlo consigo mismo.
   */
  async existeConNombre(nombre: string, excluirId?: number): Promise<boolean> {
    const cantidad = await this.prisma.equipo.count({
      where: {
        nombre,
        ...(excluirId !== undefined && { id: { not: excluirId } }),
      },
    });
    return cantidad > 0;
  }

  /** Inserta un equipo y devuelve el registro creado. */
  crear(datos: Prisma.EquipoCreateInput): Promise<Equipo> {
    return this.prisma.equipo.create({ data: datos });
  }

  /** Actualiza los campos recibidos y devuelve el equipo modificado. */
  modificar(id: number, datos: Prisma.EquipoUpdateInput): Promise<Equipo> {
    return this.prisma.equipo.update({ where: { id }, data: datos });
  }

  /** Elimina el equipo. */
  async borrar(id: number): Promise<void> {
    await this.prisma.equipo.delete({ where: { id } });
  }

  /** Indica si el equipo tiene inscripciones o partidos asociados. */
  async tieneDatosAsociados(id: number): Promise<boolean> {
    const [inscripciones, partidos] = await Promise.all([
      this.prisma.inscripcionEquipo.count({ where: { equipoId: id } }),
      this.prisma.partido.count({
        where: { OR: [{ equipoLocalId: id }, { equipoVisitanteId: id }] },
      }),
    ]);
    return inscripciones > 0 || partidos > 0;
  }
}

import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/** Campos que se devuelven de cada inscripción: sus datos y los del equipo inscripto. */
const CAMPOS_INSCRIPCION = {
  id: true,
  torneoId: true,
  equipoId: true,
  equipo: { select: { id: true, nombre: true, escudoURL: true } },
} satisfies Prisma.InscripcionEquipoSelect;

/** Inscripción tal como la devuelve la API. El tipo se deduce de CAMPOS_INSCRIPCION. */
export type InscripcionEquipoConEquipo = Prisma.InscripcionEquipoGetPayload<{
  select: typeof CAMPOS_INSCRIPCION;
}>;

/** Acceso a datos de inscripciones de equipos. Es la única capa que usa Prisma directamente. */
@Injectable()
export class InscripcionesEquipoRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Devuelve las inscripciones de un torneo, ordenadas por nombre de equipo. */
  obtenerPorTorneo(torneoId: number): Promise<InscripcionEquipoConEquipo[]> {
    return this.prisma.inscripcionEquipo.findMany({
      where: { torneoId },
      select: CAMPOS_INSCRIPCION,
      orderBy: { equipo: { nombre: 'asc' } },
    });
  }

  /** Devuelve la inscripción con ese id dentro del torneo, o null si no existe en ese torneo. */
  obtenerPorId(
    torneoId: number,
    id: string,
  ): Promise<InscripcionEquipoConEquipo | null> {
    return this.prisma.inscripcionEquipo.findFirst({
      where: { id, torneoId },
      select: CAMPOS_INSCRIPCION,
    });
  }

  /**
   * Indica si el equipo ya está inscripto en el torneo.
   * @param excluirId id de la inscripción que se está modificando, para no compararla consigo misma.
   */
  async existe(
    torneoId: number,
    equipoId: number,
    excluirId?: string,
  ): Promise<boolean> {
    const cantidad = await this.prisma.inscripcionEquipo.count({
      where: {
        torneoId,
        equipoId,
        ...(excluirId !== undefined && { id: { not: excluirId } }),
      },
    });
    return cantidad > 0;
  }

  /** Inscribe el equipo en el torneo y devuelve la inscripción creada. */
  crear(
    torneoId: number,
    equipoId: number,
  ): Promise<InscripcionEquipoConEquipo> {
    return this.prisma.inscripcionEquipo.create({
      data: { torneoId, equipoId },
      select: CAMPOS_INSCRIPCION,
    });
  }

  /** Cambia el equipo de una inscripción y devuelve la inscripción modificada. */
  modificar(id: string, equipoId: number): Promise<InscripcionEquipoConEquipo> {
    return this.prisma.inscripcionEquipo.update({
      where: { id },
      data: { equipoId },
      select: CAMPOS_INSCRIPCION,
    });
  }

  /** Elimina la inscripción. */
  async borrar(id: string): Promise<void> {
    await this.prisma.inscripcionEquipo.delete({ where: { id } });
  }

  /** Indica si la inscripción ya tiene jugadores inscriptos. */
  async tieneJugadores(id: string): Promise<boolean> {
    const cantidad = await this.prisma.inscripcionJugador.count({
      where: { inscripcionEquipoId: id },
    });
    return cantidad > 0;
  }
}

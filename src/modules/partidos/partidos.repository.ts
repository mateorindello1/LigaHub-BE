import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EstadoPartido } from './estado-partido.enum.js';

/** Datos del partido que hacen falta para validar su programación. */
const CAMPOS_PARTIDO = {
  id: true,
  estadoPartido: true,
  fechaHoraPartido: true,
  canchaId: true,
  equipoLocal: { select: { id: true, nombre: true } },
  equipoVisitante: { select: { id: true, nombre: true } },
  fechaFixture: {
    select: { torneo: { select: { nombre: true, estadoTorneo: true } } },
  },
  cancha: {
    select: {
      id: true,
      numero: true,
      predio: { select: { id: true, nombre: true } },
    },
  },
} satisfies Prisma.PartidoSelect;

export type PartidoParaProgramar = Prisma.PartidoGetPayload<{
  select: typeof CAMPOS_PARTIDO;
}>;

/** Cancha con el nombre de su predio. */
export interface CanchaConPredio {
  id: number;
  numero: number;
  predio: { id: number; nombre: string };
}

/** Partido que ocupa un horario: lo justo para explicar el conflicto. */
export interface PartidoEnConflicto {
  local: string;
  visitante: string;
  fechaHora: Date;
}

/** Datos para programar un partido, ya validados por el servicio. */
export interface DatosProgramacion {
  fechaHoraPartido: Date | null;
  canchaId: number | null;
  estadoPartido: EstadoPartido;
}

/** Acceso a datos de partidos. Es la única capa que usa Prisma directamente. */
@Injectable()
export class PartidosRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Devuelve el partido con sus equipos, su torneo y su cancha, o null si no existe. */
  obtenerPorId(id: string): Promise<PartidoParaProgramar | null> {
    return this.prisma.partido.findUnique({
      where: { id },
      select: CAMPOS_PARTIDO,
    });
  }

  /** Devuelve la cancha con su predio, o null si no existe. */
  obtenerCancha(id: number): Promise<CanchaConPredio | null> {
    return this.prisma.cancha.findUnique({
      where: { id },
      select: {
        id: true,
        numero: true,
        predio: { select: { id: true, nombre: true } },
      },
    });
  }

  /**
   * Busca otro partido en la cancha que empiece entre "desde" y "hasta" (sin incluir los extremos).
   * Los suspendidos no ocupan el horario: no se jugaron.
   */
  partidoEnCancha(
    canchaId: number,
    desde: Date,
    hasta: Date,
    excluirId: string,
  ): Promise<PartidoEnConflicto | null> {
    return this.buscarConflicto({ canchaId }, desde, hasta, excluirId);
  }

  /** Busca otro partido de cualquiera de esos equipos, en cualquier torneo, en ese rango. */
  partidoDeEquipos(
    equipoIds: number[],
    desde: Date,
    hasta: Date,
    excluirId: string,
  ): Promise<PartidoEnConflicto | null> {
    return this.buscarConflicto(
      {
        OR: [
          { equipoLocalId: { in: equipoIds } },
          { equipoVisitanteId: { in: equipoIds } },
        ],
      },
      desde,
      hasta,
      excluirId,
    );
  }

  /** Guarda la programación y devuelve el partido actualizado. */
  programar(
    id: string,
    datos: DatosProgramacion,
  ): Promise<PartidoParaProgramar> {
    return this.prisma.partido.update({
      where: { id },
      data: datos,
      select: CAMPOS_PARTIDO,
    });
  }

  /** Primer partido que cumple el filtro y empieza dentro del rango. */
  private async buscarConflicto(
    filtro: Prisma.PartidoWhereInput,
    desde: Date,
    hasta: Date,
    excluirId: string,
  ): Promise<PartidoEnConflicto | null> {
    const partido = await this.prisma.partido.findFirst({
      where: {
        ...filtro,
        id: { not: excluirId },
        estadoPartido: { not: EstadoPartido.Suspendido },
        fechaHoraPartido: { gt: desde, lt: hasta },
      },
      select: {
        fechaHoraPartido: true,
        equipoLocal: { select: { nombre: true } },
        equipoVisitante: { select: { nombre: true } },
      },
      orderBy: { fechaHoraPartido: 'asc' },
    });
    return partido
      ? {
          local: partido.equipoLocal.nombre,
          visitante: partido.equipoVisitante.nombre,
          // El filtro por rango garantiza que no es null.
          fechaHora: partido.fechaHoraPartido!,
        }
      : null;
  }
}

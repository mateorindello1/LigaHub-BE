import { randomUUID } from 'node:crypto';
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

/** Partido con todo lo que muestra su planilla: equipos, torneo, cancha, jugadores y eventos. */
const CAMPOS_PLANILLA = {
  id: true,
  estadoPartido: true,
  fechaHoraPartido: true,
  cantidadGolesLocal: true,
  cantidadGolesVisitante: true,
  equipoLocal: { select: { id: true, nombre: true, escudoURL: true } },
  equipoVisitante: { select: { id: true, nombre: true, escudoURL: true } },
  cancha: {
    select: { numero: true, predio: { select: { nombre: true } } },
  },
  fechaFixture: {
    select: {
      numeroFecha: true,
      torneo: { select: { id: true, nombre: true, estadoTorneo: true } },
    },
  },
  partidoJugadores: {
    select: {
      inscripcionJugadorId: true,
      eventos: {
        select: {
          id: true,
          tipoEvento: true,
          minuto: true,
          partidoJugadorCambio: { select: { inscripcionJugadorId: true } },
        },
      },
    },
  },
} satisfies Prisma.PartidoSelect;

export type PartidoConPlanilla = Prisma.PartidoGetPayload<{
  select: typeof CAMPOS_PLANILLA;
}>;

/** Jugador inscripto en uno de los dos equipos del partido, para el torneo del partido. */
export interface JugadorDelPlantel {
  inscripcionJugadorId: string;
  equipoId: number;
  dorsal: number;
  capitan: boolean;
  jugador: { id: number; nombres: string; apellidos: string };
}

/** Evento a guardar: los jugadores se identifican por su inscripción en el equipo. */
export interface EventoAGuardar {
  tipoEvento: number;
  minuto: number;
  inscripcionJugadorId: string;
  inscripcionJugadorEntraId: string | null;
}

/** Resultado a guardar, ya validado por el servicio. */
export interface DatosResultado {
  estadoPartido: EstadoPartido;
  golesLocal: number | null;
  golesVisitante: number | null;
  /** Inscripciones de los jugadores que participaron. */
  jugadores: string[];
  eventos: EventoAGuardar[];
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

  /** Devuelve el partido con su planilla, o null si no existe. */
  obtenerPlanilla(id: string): Promise<PartidoConPlanilla | null> {
    return this.prisma.partido.findUnique({
      where: { id },
      select: CAMPOS_PLANILLA,
    });
  }

  /** Jugadores inscriptos en esos equipos para el torneo, por equipo y dorsal. */
  async obtenerPlanteles(
    torneoId: number,
    equipoIds: number[],
  ): Promise<JugadorDelPlantel[]> {
    const inscripciones = await this.prisma.inscripcionJugador.findMany({
      where: {
        inscripcionEquipo: { torneoId, equipoId: { in: equipoIds } },
      },
      select: {
        id: true,
        dorsal: true,
        capitan: true,
        jugador: { select: { id: true, nombres: true, apellidos: true } },
        inscripcionEquipo: { select: { equipoId: true } },
      },
      orderBy: { dorsal: 'asc' },
    });
    return inscripciones.map((inscripcion) => ({
      inscripcionJugadorId: inscripcion.id,
      equipoId: inscripcion.inscripcionEquipo.equipoId,
      dorsal: inscripcion.dorsal,
      capitan: inscripcion.capitan,
      jugador: inscripcion.jugador,
    }));
  }

  /**
   * Guarda el resultado en una transacción: borra los jugadores y eventos que hubiera, crea los
   * nuevos y actualiza el estado y el marcador del partido. Si algo falla, no queda nada a medias.
   */
  async guardarResultado(id: string, datos: DatosResultado): Promise<void> {
    // Los ids de PartidoJugador se generan acá para relacionar los eventos sin consultar
    // (createMany no devuelve los ids en SQL Server), igual que las fechas del fixture.
    const idPorInscripcion = new Map(
      datos.jugadores.map((inscripcionId) => [inscripcionId, randomUUID()]),
    );

    await this.prisma.$transaction(async (tx) => {
      await this.borrarPlanilla(tx, id);
      await tx.partidoJugador.createMany({
        data: [...idPorInscripcion].map(([inscripcionJugadorId, idFila]) => ({
          id: idFila,
          partidoId: id,
          inscripcionJugadorId,
        })),
      });
      await tx.evento.createMany({
        data: datos.eventos.map((evento) => ({
          tipoEvento: evento.tipoEvento,
          minuto: evento.minuto,
          partidoJugadorId: idPorInscripcion.get(evento.inscripcionJugadorId)!,
          partidoJugadorCambioId: evento.inscripcionJugadorEntraId
            ? idPorInscripcion.get(evento.inscripcionJugadorEntraId)!
            : null,
        })),
      });
      await tx.partido.update({
        where: { id },
        data: {
          estadoPartido: datos.estadoPartido,
          cantidadGolesLocal: datos.golesLocal,
          cantidadGolesVisitante: datos.golesVisitante,
        },
      });
    });
  }

  /** Borra jugadores, eventos y marcador, y vuelve el partido a Programado. */
  async anularResultado(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.borrarPlanilla(tx, id);
      await tx.partido.update({
        where: { id },
        data: {
          estadoPartido: EstadoPartido.Programado,
          cantidadGolesLocal: null,
          cantidadGolesVisitante: null,
        },
      });
    });
  }

  /** Borra los eventos y los jugadores del partido (primero los eventos, que los referencian). */
  private async borrarPlanilla(
    tx: Prisma.TransactionClient,
    partidoId: string,
  ): Promise<void> {
    await tx.evento.deleteMany({ where: { partidoJugador: { partidoId } } });
    await tx.partidoJugador.deleteMany({ where: { partidoId } });
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

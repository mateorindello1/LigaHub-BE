import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ESTADOS_CON_RESULTADO } from '../partidos/estado-partido.enum.js';
import type {
  EquipoTabla,
  PartidoConResultado,
} from './calcular-posiciones.js';

/** Datos del equipo que se devuelven en la tabla y en el detalle. */
const CAMPOS_EQUIPO = {
  id: true,
  nombre: true,
  escudoURL: true,
} satisfies Prisma.EquipoSelect;

/** Inscripción del equipo con sus jugadores, para el detalle. */
const CAMPOS_INSCRIPCION_CON_JUGADORES = {
  id: true,
  equipo: { select: CAMPOS_EQUIPO },
  jugadores: {
    select: {
      id: true,
      dorsal: true,
      capitan: true,
      jugador: { select: { id: true, nombres: true, apellidos: true } },
    },
    orderBy: { dorsal: 'asc' },
  },
} satisfies Prisma.InscripcionEquipoSelect;

export type InscripcionConJugadores = Prisma.InscripcionEquipoGetPayload<{
  select: typeof CAMPOS_INSCRIPCION_CON_JUGADORES;
}>;

/** Partido del equipo con la fecha del fixture, los rivales y la cancha, para el detalle. */
const CAMPOS_PARTIDO_DEL_EQUIPO = {
  id: true,
  estadoPartido: true,
  fechaHoraPartido: true,
  equipoLocalId: true,
  equipoVisitanteId: true,
  cantidadGolesLocal: true,
  cantidadGolesVisitante: true,
  fechaFixture: { select: { numeroFecha: true } },
  equipoLocal: { select: { id: true, nombre: true } },
  equipoVisitante: { select: { id: true, nombre: true } },
  cancha: {
    select: { numero: true, predio: { select: { nombre: true } } },
  },
} satisfies Prisma.PartidoSelect;

export type PartidoDelEquipo = Prisma.PartidoGetPayload<{
  select: typeof CAMPOS_PARTIDO_DEL_EQUIPO;
}>;

/** Consultas para la tabla de posiciones y el detalle de un equipo en un torneo. */
@Injectable()
export class PosicionesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Equipos inscriptos en el torneo. */
  async obtenerEquiposInscriptos(torneoId: number): Promise<EquipoTabla[]> {
    const inscripciones = await this.prisma.inscripcionEquipo.findMany({
      where: { torneoId },
      select: { equipo: { select: CAMPOS_EQUIPO } },
    });
    return inscripciones.map((inscripcion) => inscripcion.equipo);
  }

  /** Partidos del torneo que cuentan para la tabla: finalizados o por WO, con resultado cargado. */
  async obtenerPartidosConResultado(
    torneoId: number,
  ): Promise<PartidoConResultado[]> {
    const partidos = await this.prisma.partido.findMany({
      where: {
        fechaFixture: { torneoId },
        estadoPartido: { in: [...ESTADOS_CON_RESULTADO] },
        cantidadGolesLocal: { not: null },
        cantidadGolesVisitante: { not: null },
      },
      select: {
        equipoLocalId: true,
        equipoVisitanteId: true,
        cantidadGolesLocal: true,
        cantidadGolesVisitante: true,
      },
    });

    // El filtro "not: null" garantiza los goles; el tipo de Prisma igual los marca como opcionales.
    return partidos.map((partido) => ({
      equipoLocalId: partido.equipoLocalId,
      equipoVisitanteId: partido.equipoVisitanteId,
      golesLocal: partido.cantidadGolesLocal ?? 0,
      golesVisitante: partido.cantidadGolesVisitante ?? 0,
    }));
  }

  /** Inscripción del equipo en el torneo con sus jugadores, o null si el equipo no está inscripto. */
  obtenerInscripcionConJugadores(
    torneoId: number,
    equipoId: number,
  ): Promise<InscripcionConJugadores | null> {
    return this.prisma.inscripcionEquipo.findUnique({
      // Clave única compuesta (equipoId, torneoId): Prisma la expone con este nombre.
      where: { equipoId_torneoId: { equipoId, torneoId } },
      select: CAMPOS_INSCRIPCION_CON_JUGADORES,
    });
  }

  /** Todos los partidos del equipo en el torneo (jugados o no), ordenados por fecha del fixture. */
  obtenerPartidosDelEquipo(
    torneoId: number,
    equipoId: number,
  ): Promise<PartidoDelEquipo[]> {
    return this.prisma.partido.findMany({
      where: {
        fechaFixture: { torneoId },
        OR: [{ equipoLocalId: equipoId }, { equipoVisitanteId: equipoId }],
      },
      select: CAMPOS_PARTIDO_DEL_EQUIPO,
      orderBy: [
        { fechaFixture: { numeroFecha: 'asc' } },
        { fechaHoraPartido: 'asc' },
      ],
    });
  }
}

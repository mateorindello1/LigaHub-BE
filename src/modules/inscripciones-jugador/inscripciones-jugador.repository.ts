import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * Campos que se devuelven de cada inscripción de jugador: dorsal, capitanía y nombre del jugador.
 * No incluye datos personales (DNI, email, teléfono): el listado es público.
 */
const CAMPOS_INSCRIPCION_JUGADOR = {
  id: true,
  inscripcionEquipoId: true,
  jugadorId: true,
  dorsal: true,
  capitan: true,
  jugador: { select: { id: true, nombres: true, apellidos: true } },
} satisfies Prisma.InscripcionJugadorSelect;

/** Inscripción de jugador tal como la devuelve la API. El tipo se deduce de los campos. */
export type InscripcionJugadorConJugador = Prisma.InscripcionJugadorGetPayload<{
  select: typeof CAMPOS_INSCRIPCION_JUGADOR;
}>;

/** Datos para guardar una inscripción de jugador, ya validados por el servicio. */
export interface DatosInscripcionJugador {
  dorsal: number;
  capitan: boolean;
}

/** Acceso a datos de inscripciones de jugadores. Es la única capa que usa Prisma directamente. */
@Injectable()
export class InscripcionesJugadorRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Devuelve los jugadores inscriptos en el equipo, por dorsal. */
  obtenerPorInscripcionEquipo(
    inscripcionEquipoId: string,
  ): Promise<InscripcionJugadorConJugador[]> {
    return this.prisma.inscripcionJugador.findMany({
      where: { inscripcionEquipoId },
      select: CAMPOS_INSCRIPCION_JUGADOR,
      orderBy: { dorsal: 'asc' },
    });
  }

  /** Devuelve la inscripción del jugador dentro de la del equipo, o null si no existe en ella. */
  obtenerPorId(
    inscripcionEquipoId: string,
    id: string,
  ): Promise<InscripcionJugadorConJugador | null> {
    return this.prisma.inscripcionJugador.findFirst({
      where: { id, inscripcionEquipoId },
      select: CAMPOS_INSCRIPCION_JUGADOR,
    });
  }

  /**
   * Devuelve el nombre del equipo en el que el jugador ya está inscripto en ese torneo, o null
   * si no está inscripto en ninguno.
   */
  async equipoDelJugadorEnTorneo(
    torneoId: number,
    jugadorId: number,
  ): Promise<string | null> {
    const inscripcion = await this.prisma.inscripcionJugador.findFirst({
      where: { jugadorId, inscripcionEquipo: { torneoId } },
      select: {
        inscripcionEquipo: { select: { equipo: { select: { nombre: true } } } },
      },
    });
    return inscripcion?.inscripcionEquipo.equipo.nombre ?? null;
  }

  /**
   * Devuelve el nombre del jugador que ya usa ese dorsal en el equipo, o null si está libre.
   * @param excluirId inscripción que se está modificando, para no compararla consigo misma.
   */
  async jugadorConDorsal(
    inscripcionEquipoId: string,
    dorsal: number,
    excluirId?: string,
  ): Promise<string | null> {
    const inscripcion = await this.prisma.inscripcionJugador.findFirst({
      where: {
        inscripcionEquipoId,
        dorsal,
        ...(excluirId !== undefined && { id: { not: excluirId } }),
      },
      select: { jugador: { select: { nombres: true, apellidos: true } } },
    });
    return inscripcion
      ? `${inscripcion.jugador.nombres} ${inscripcion.jugador.apellidos}`
      : null;
  }

  /**
   * Inscribe al jugador. Si es capitán, en la misma transacción le quita la capitanía al
   * capitán anterior del equipo: siempre hay como máximo uno.
   */
  crear(
    inscripcionEquipoId: string,
    jugadorId: number,
    datos: DatosInscripcionJugador,
  ): Promise<InscripcionJugadorConJugador> {
    return this.prisma.$transaction(async (tx) => {
      if (datos.capitan) {
        await tx.inscripcionJugador.updateMany({
          where: { inscripcionEquipoId, capitan: true },
          data: { capitan: false },
        });
      }
      return tx.inscripcionJugador.create({
        data: { inscripcionEquipoId, jugadorId, ...datos },
        select: CAMPOS_INSCRIPCION_JUGADOR,
      });
    });
  }

  /** Modifica el dorsal o la capitanía. Igual que al crear, si pasa a ser capitán, el anterior deja de serlo. */
  modificar(
    inscripcionEquipoId: string,
    id: string,
    datos: DatosInscripcionJugador,
  ): Promise<InscripcionJugadorConJugador> {
    return this.prisma.$transaction(async (tx) => {
      if (datos.capitan) {
        await tx.inscripcionJugador.updateMany({
          where: { inscripcionEquipoId, capitan: true, id: { not: id } },
          data: { capitan: false },
        });
      }
      return tx.inscripcionJugador.update({
        where: { id },
        data: datos,
        select: CAMPOS_INSCRIPCION_JUGADOR,
      });
    });
  }

  /** Elimina la inscripción del jugador. */
  async borrar(id: string): Promise<void> {
    await this.prisma.inscripcionJugador.delete({ where: { id } });
  }

  /** Indica si el jugador ya jugó algún partido con esta inscripción. */
  async jugoPartidos(id: string): Promise<boolean> {
    const cantidad = await this.prisma.partidoJugador.count({
      where: { inscripcionJugadorId: id },
    });
    return cantidad > 0;
  }
}

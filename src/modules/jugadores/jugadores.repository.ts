import { Injectable } from '@nestjs/common';
import type { Jugador, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/** Campos de cada jugador, con el id de su usuario (un jugador tiene como máximo uno). */
const CAMPOS_JUGADOR = {
  id: true,
  dni: true,
  nombres: true,
  apellidos: true,
  email: true,
  telefono: true,
  direccion: true,
  usuarios: { select: { id: true }, take: 1 },
} satisfies Prisma.JugadorSelect;

/** Inscripciones del jugador, con el equipo y el torneo, para "sus datos e inscripciones". */
const CAMPOS_INSCRIPCIONES = {
  inscripciones: {
    select: {
      id: true,
      dorsal: true,
      capitan: true,
      inscripcionEquipo: {
        select: {
          id: true,
          equipo: { select: { id: true, nombre: true, escudoURL: true } },
          torneo: {
            select: { id: true, nombre: true, anio: true, estadoTorneo: true },
          },
        },
      },
    },
    // Las más recientes primero.
    orderBy: [
      { inscripcionEquipo: { torneo: { anio: 'desc' } } },
      { inscripcionEquipo: { torneoId: 'desc' } },
    ],
  },
} satisfies Prisma.JugadorSelect;

/** Jugador tal como lo devuelve la API: sus datos y el id de su usuario, o null si no tiene. */
export interface JugadorConUsuario extends Jugador {
  usuarioId: number | null;
}

/** Inscripción del jugador en un equipo de un torneo. */
export interface InscripcionDelJugador {
  /** Id de la inscripción del jugador (InscripcionJugador). */
  id: string;
  dorsal: number;
  capitan: boolean;
  /** Id de la inscripción del equipo en el torneo. */
  inscripcionEquipoId: string;
  equipo: { id: number; nombre: string; escudoURL: string | null };
  torneo: { id: number; nombre: string; anio: number; estadoTorneo: number };
}

/** Jugador con sus inscripciones (GET /jugadores/:id). */
export interface JugadorConInscripciones extends JugadorConUsuario {
  inscripciones: InscripcionDelJugador[];
}

/** Cantidad de registros que dependen de un jugador e impiden borrarlo. */
export interface AsociadosJugador {
  inscripciones: number;
  usuarios: number;
}

/** Acceso a datos de jugadores. Es la única capa que usa Prisma directamente. */
@Injectable()
export class JugadoresRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Devuelve los jugadores por apellido y nombre.
   * @param disponiblesEnTorneo si viene, solo los que no están inscriptos en ningún equipo de ese torneo.
   */
  async obtenerTodos(
    disponiblesEnTorneo?: number,
  ): Promise<JugadorConUsuario[]> {
    const jugadores = await this.prisma.jugador.findMany({
      where:
        disponiblesEnTorneo !== undefined
          ? {
              inscripciones: {
                none: { inscripcionEquipo: { torneoId: disponiblesEnTorneo } },
              },
            }
          : undefined,
      select: CAMPOS_JUGADOR,
      orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }],
    });
    return jugadores.map(aJugadorConUsuario);
  }

  /** Devuelve el jugador con ese id, o null si no existe. */
  async obtenerPorId(id: number): Promise<JugadorConUsuario | null> {
    const jugador = await this.prisma.jugador.findUnique({
      where: { id },
      select: CAMPOS_JUGADOR,
    });
    return jugador && aJugadorConUsuario(jugador);
  }

  /** Devuelve el jugador con sus inscripciones, o null si no existe. */
  async obtenerConInscripciones(
    id: number,
  ): Promise<JugadorConInscripciones | null> {
    const jugador = await this.prisma.jugador.findUnique({
      where: { id },
      select: { ...CAMPOS_JUGADOR, ...CAMPOS_INSCRIPCIONES },
    });
    if (!jugador) return null;

    const { inscripciones, ...datos } = jugador;
    return {
      ...aJugadorConUsuario(datos),
      inscripciones: inscripciones.map(
        ({ inscripcionEquipo, ...inscripcion }) => ({
          ...inscripcion,
          inscripcionEquipoId: inscripcionEquipo.id,
          equipo: inscripcionEquipo.equipo,
          torneo: inscripcionEquipo.torneo,
        }),
      ),
    };
  }

  /**
   * Indica si ya existe otro jugador con ese DNI.
   * @param excluirId id del jugador que se está modificando, para no compararlo consigo mismo.
   */
  async existeConDni(dni: string, excluirId?: number): Promise<boolean> {
    const cantidad = await this.prisma.jugador.count({
      where: {
        dni,
        ...(excluirId !== undefined && { id: { not: excluirId } }),
      },
    });
    return cantidad > 0;
  }

  /** Inserta un jugador y devuelve el registro creado. */
  async crear(datos: Prisma.JugadorCreateInput): Promise<JugadorConUsuario> {
    const jugador = await this.prisma.jugador.create({
      data: datos,
      select: CAMPOS_JUGADOR,
    });
    return aJugadorConUsuario(jugador);
  }

  /** Actualiza los campos recibidos y devuelve el jugador modificado. */
  async modificar(
    id: number,
    datos: Prisma.JugadorUpdateInput,
  ): Promise<JugadorConUsuario> {
    const jugador = await this.prisma.jugador.update({
      where: { id },
      data: datos,
      select: CAMPOS_JUGADOR,
    });
    return aJugadorConUsuario(jugador);
  }

  /** Elimina el jugador. */
  async borrar(id: number): Promise<void> {
    await this.prisma.jugador.delete({ where: { id } });
  }

  /** Cuenta las inscripciones y los usuarios del jugador. */
  async contarAsociados(id: number): Promise<AsociadosJugador> {
    const [inscripciones, usuarios] = await Promise.all([
      this.prisma.inscripcionJugador.count({ where: { jugadorId: id } }),
      this.prisma.usuario.count({ where: { jugadorId: id } }),
    ]);
    return { inscripciones, usuarios };
  }
}

/** Reemplaza la lista de usuarios (de a lo sumo uno) por el id del usuario. */
function aJugadorConUsuario({
  usuarios,
  ...jugador
}: Jugador & { usuarios: { id: number }[] }): JugadorConUsuario {
  return { ...jugador, usuarioId: usuarios[0]?.id ?? null };
}

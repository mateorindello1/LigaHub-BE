import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EstadoPartido } from '../partidos/estado-partido.enum.js';
import { EstadoTorneo } from '../torneos/estado-torneo.enum.js';
import type { FechaGenerada } from './generar-fixture.js';

/** Días entre una fecha del fixture y la siguiente. */
const DIAS_ENTRE_FECHAS = 7;

/** Fecha del fixture con sus partidos, tal como se consulta para mostrarla. */
const CAMPOS_FECHA = {
  id: true,
  numeroFecha: true,
  partidos: {
    select: {
      id: true,
      estadoPartido: true,
      fechaHoraPartido: true,
      cantidadGolesLocal: true,
      cantidadGolesVisitante: true,
      equipoLocal: { select: { id: true, nombre: true } },
      equipoVisitante: { select: { id: true, nombre: true } },
      cancha: {
        select: { numero: true, predio: { select: { nombre: true } } },
      },
    },
    orderBy: { fechaHoraPartido: 'asc' },
  },
} satisfies Prisma.FechaFixtureSelect;

export type FechaConPartidos = Prisma.FechaFixtureGetPayload<{
  select: typeof CAMPOS_FECHA;
}>;

/** Acceso a datos del fixture: fechas y partidos de un torneo. */
@Injectable()
export class FixtureRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Equipos inscriptos en el torneo, ordenados por nombre. */
  async obtenerEquiposInscriptos(
    torneoId: number,
  ): Promise<{ id: number; nombre: string }[]> {
    const inscripciones = await this.prisma.inscripcionEquipo.findMany({
      where: { torneoId },
      select: { equipo: { select: { id: true, nombre: true } } },
      orderBy: { equipo: { nombre: 'asc' } },
    });
    return inscripciones.map((inscripcion) => inscripcion.equipo);
  }

  /** Fechas del fixture con sus partidos, en orden. Vacío si no hay fixture. */
  obtenerFechas(torneoId: number): Promise<FechaConPartidos[]> {
    return this.prisma.fechaFixture.findMany({
      where: { torneoId },
      select: CAMPOS_FECHA,
      orderBy: { numeroFecha: 'asc' },
    });
  }

  /** Indica si el torneo ya tiene fechas de fixture. */
  async tieneFixture(torneoId: number): Promise<boolean> {
    return (await this.prisma.fechaFixture.count({ where: { torneoId } })) > 0;
  }

  /** Indica si algún partido del torneo ya se jugó, se suspendió o tiene jugadores cargados. */
  async tienePartidosConActividad(torneoId: number): Promise<boolean> {
    const cantidad = await this.prisma.partido.count({
      where: {
        fechaFixture: { torneoId },
        OR: [
          { estadoPartido: { not: EstadoPartido.Programado } },
          { partidoJugadores: { some: {} } },
        ],
      },
    });
    return cantidad > 0;
  }

  /**
   * Guarda el fixture y pasa el torneo a EnCurso, todo en una transacción:
   * si algo falla, no queda nada a medio guardar (como un unit of work con commit o rollback).
   *
   * @param fechaInicio día y hora de la primera fecha; las siguientes, una semana después cada una.
   *                    Si es null, los partidos quedan sin día y hora.
   */
  async guardarFixture(
    torneoId: number,
    fechas: FechaGenerada[],
    fechaInicio: Date | null,
  ): Promise<void> {
    // Los ids de las fechas se generan acá para poder relacionar los partidos sin consultar.
    const filasFechas = fechas.map((fecha) => ({
      id: randomUUID(),
      torneoId,
      numeroFecha: fecha.numeroFecha,
    }));

    const filasPartidos = fechas.flatMap((fecha, indice) =>
      fecha.partidos.map((partido) => ({
        fechaFixtureId: filasFechas[indice].id,
        estadoPartido: EstadoPartido.Programado,
        fechaHoraPartido: fechaInicio
          ? sumarDias(fechaInicio, indice * DIAS_ENTRE_FECHAS)
          : null,
        equipoLocalId: partido.localId,
        equipoVisitanteId: partido.visitanteId,
      })),
    );

    // Transacción interactiva: todas las operaciones usan "tx" en lugar de "this.prisma".
    await this.prisma.$transaction(async (tx) => {
      await tx.fechaFixture.createMany({ data: filasFechas });
      await tx.partido.createMany({ data: filasPartidos });
      await tx.torneo.update({
        where: { id: torneoId },
        data: { estadoTorneo: EstadoTorneo.EnCurso },
      });
    });
  }

  /** Borra los partidos y las fechas del torneo y lo vuelve a Inscripcion, en una transacción. */
  async borrarFixture(torneoId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.partido.deleteMany({ where: { fechaFixture: { torneoId } } });
      await tx.fechaFixture.deleteMany({ where: { torneoId } });
      await tx.torneo.update({
        where: { id: torneoId },
        data: { estadoTorneo: EstadoTorneo.Inscripcion },
      });
    });
  }
}

/** Devuelve una fecha nueva, corrida la cantidad de días indicada. */
function sumarDias(fecha: Date, dias: number): Date {
  const resultado = new Date(fecha);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}

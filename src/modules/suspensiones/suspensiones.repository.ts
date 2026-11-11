import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EstadoPartido } from '../partidos/estado-partido.enum.js';
import { TipoEvento } from '../partidos/tipo-evento.enum.js';
import type { PartidoDelTorneo, Tarjeta } from './calcular-suspensiones.js';

/** Consultas para calcular las suspensiones de un torneo. */
@Injectable()
export class SuspensionesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Todos los partidos del torneo, jugados o no. */
  async obtenerPartidos(torneoId: number): Promise<PartidoDelTorneo[]> {
    const partidos = await this.prisma.partido.findMany({
      where: { fechaFixture: { torneoId } },
      select: {
        id: true,
        estadoPartido: true,
        equipoLocalId: true,
        equipoVisitanteId: true,
        fechaFixture: { select: { numeroFecha: true } },
      },
    });
    return partidos.map(({ fechaFixture, ...partido }) => ({
      ...partido,
      numeroFecha: fechaFixture.numeroFecha,
    }));
  }

  /** Amonestaciones y expulsiones de los partidos jugados del torneo. */
  async obtenerTarjetas(torneoId: number): Promise<Tarjeta[]> {
    const eventos = await this.prisma.evento.findMany({
      where: {
        tipoEvento: { in: [TipoEvento.Amonestacion, TipoEvento.Expulsion] },
        partidoJugador: {
          partido: {
            fechaFixture: { torneoId },
            estadoPartido: EstadoPartido.Finalizado,
          },
        },
      },
      select: {
        tipoEvento: true,
        partidoJugador: {
          select: {
            partidoId: true,
            inscripcionJugador: {
              select: {
                id: true,
                jugador: {
                  select: { id: true, nombres: true, apellidos: true },
                },
                inscripcionEquipo: {
                  select: { equipo: { select: { id: true, nombre: true } } },
                },
              },
            },
          },
        },
      },
    });
    return eventos.map(({ tipoEvento, partidoJugador }) => ({
      // El filtro de la consulta garantiza que es una amonestación o una expulsión.
      tipoEvento: tipoEvento as Tarjeta['tipoEvento'],
      partidoId: partidoJugador.partidoId,
      inscripcionJugadorId: partidoJugador.inscripcionJugador.id,
      jugador: partidoJugador.inscripcionJugador.jugador,
      equipo: partidoJugador.inscripcionJugador.inscripcionEquipo.equipo,
    }));
  }
}

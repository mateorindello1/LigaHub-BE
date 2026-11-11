import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EstadoPartido } from '../partidos/estado-partido.enum.js';
import { TipoEvento } from '../partidos/tipo-evento.enum.js';
import type { Participacion } from './calcular-goleadores.js';

/** Consultas para la tabla de goleadores. */
@Injectable()
export class GoleadoresRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Participaciones en los partidos jugados del torneo, con la cantidad de goles de cada una. Los
   * W.O. no cuentan: no tienen planilla.
   */
  async obtenerParticipaciones(torneoId: number): Promise<Participacion[]> {
    const participaciones = await this.prisma.partidoJugador.findMany({
      where: {
        partido: {
          fechaFixture: { torneoId },
          estadoPartido: EstadoPartido.Finalizado,
        },
      },
      select: {
        inscripcionJugador: {
          select: {
            id: true,
            jugador: { select: { id: true, nombres: true, apellidos: true } },
            inscripcionEquipo: {
              select: {
                equipo: { select: { id: true, nombre: true, escudoURL: true } },
              },
            },
          },
        },
        // Cuenta filtrada: Prisma la resuelve con un COUNT en la misma consulta.
        _count: {
          select: { eventos: { where: { tipoEvento: TipoEvento.Gol } } },
        },
      },
    });
    return participaciones.map(({ inscripcionJugador, _count }) => ({
      inscripcionJugadorId: inscripcionJugador.id,
      jugador: inscripcionJugador.jugador,
      equipo: inscripcionJugador.inscripcionEquipo.equipo,
      goles: _count.eventos,
    }));
  }
}

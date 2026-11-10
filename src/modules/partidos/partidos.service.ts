import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoTorneo } from '../torneos/estado-torneo.enum.js';
import { ProgramarPartidoDto } from './dto/programar-partido.dto.js';
import { EstadoPartido } from './estado-partido.enum.js';
import {
  PartidosRepository,
  type PartidoEnConflicto,
  type PartidoParaProgramar,
} from './partidos.repository.js';

/**
 * Tiempo que ocupa un partido en la cancha. Dos partidos que empiezan con menos de esta
 * diferencia se superponen. El seed programa uno por hora en cada cancha.
 */
export const DURACION_PARTIDO_MINUTOS = 60;

/** Partido programado, tal como lo devuelve PATCH /partidos/:id/programacion. */
export interface PartidoProgramado {
  id: string;
  estadoPartido: number;
  fechaHora: Date | null;
  cancha: {
    id: number;
    numero: number;
    predioId: number;
    predio: string;
  } | null;
}

/** Formato de los horarios en los mensajes de error: hora de Argentina, sea cual sea la del servidor. */
const formatoHorario = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: 'numeric',
  month: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * Caso de uso: programar un partido del fixture (asignarle cancha y día y hora).
 *
 * Reglas:
 * - Un partido finalizado o ganado por WO ya se jugó: no se reprograma.
 * - Un torneo finalizado no se modifica.
 * - Una cancha no tiene dos partidos superpuestos (DURACION_PARTIDO_MINUTOS).
 * - Un equipo no juega dos partidos superpuestos, aunque sean de torneos distintos.
 * - Un partido suspendido al que se le da un nuevo día y hora vuelve a estar Programado.
 */
@Injectable()
export class PartidosService {
  constructor(private readonly partidosRepository: PartidosRepository) {}

  /**
   * Asigna cancha y día y hora. Lo que no viene en el pedido queda como estaba; null lo deja
   * "a confirmar".
   */
  async programar(
    id: string,
    dto: ProgramarPartidoDto,
  ): Promise<PartidoProgramado> {
    // #region Validaciones del partido
    const partido = await this.partidosRepository.obtenerPorId(id);
    if (!partido) {
      throw new NotFoundException(`No existe el partido ${id}.`);
    }
    if (
      partido.fechaFixture.torneo.estadoTorneo ===
      (EstadoTorneo.Finalizado as number)
    ) {
      throw new ConflictException(
        `El torneo "${partido.fechaFixture.torneo.nombre}" está finalizado: sus partidos ya no se pueden programar.`,
      );
    }
    if (
      partido.estadoPartido === (EstadoPartido.Finalizado as number) ||
      partido.estadoPartido === (EstadoPartido.WO as number)
    ) {
      throw new ConflictException(
        'El partido ya se jugó: no se puede reprogramar.',
      );
    }
    // #endregion

    // Valores finales: lo que vino en el pedido o lo que ya tenía.
    const fechaHora =
      dto.fechaHora === undefined
        ? partido.fechaHoraPartido
        : dto.fechaHora === null
          ? null
          : new Date(dto.fechaHora);
    const canchaId =
      dto.canchaId === undefined ? partido.canchaId : dto.canchaId;

    // #region Validaciones de la programación
    if (canchaId !== null) {
      const cancha = await this.partidosRepository.obtenerCancha(canchaId);
      if (!cancha) {
        throw new NotFoundException(`No existe la cancha ${canchaId}.`);
      }
      if (fechaHora) {
        const [desde, hasta] = rangoSuperpuesto(fechaHora);
        const ocupada = await this.partidosRepository.partidoEnCancha(
          canchaId,
          desde,
          hasta,
          id,
        );
        if (ocupada) {
          throw new ConflictException(
            `La cancha ${cancha.numero} de ${cancha.predio.nombre} está ocupada: ${describir(ocupada)}.`,
          );
        }
      }
    }

    if (fechaHora) {
      const [desde, hasta] = rangoSuperpuesto(fechaHora);
      const superpuesto = await this.partidosRepository.partidoDeEquipos(
        [partido.equipoLocal.id, partido.equipoVisitante.id],
        desde,
        hasta,
        id,
      );
      if (superpuesto) {
        throw new ConflictException(
          `Uno de los equipos ya juega a esa hora: ${describir(superpuesto)}.`,
        );
      }
    }
    // #endregion

    // Un suspendido con día y hora nuevos se vuelve a jugar.
    const reprogramaSuspendido =
      partido.estadoPartido === (EstadoPartido.Suspendido as number) &&
      dto.fechaHora !== undefined &&
      fechaHora !== null;

    const actualizado = await this.partidosRepository.programar(id, {
      fechaHoraPartido: fechaHora,
      canchaId,
      estadoPartido: reprogramaSuspendido
        ? EstadoPartido.Programado
        : (partido.estadoPartido as EstadoPartido),
    });
    return aVista(actualizado);
  }
}

/** Rango de inicios que se superponen con un partido que empieza a esa hora. */
function rangoSuperpuesto(fechaHora: Date): [Date, Date] {
  const margen = DURACION_PARTIDO_MINUTOS * 60_000;
  return [
    new Date(fechaHora.getTime() - margen),
    new Date(fechaHora.getTime() + margen),
  ];
}

/** "Los Halcones vs Deportivo Sur, el 21/11 18:00". */
function describir(partido: PartidoEnConflicto): string {
  return `${partido.local} vs ${partido.visitante}, el ${formatoHorario.format(partido.fechaHora)}`;
}

function aVista(partido: PartidoParaProgramar): PartidoProgramado {
  return {
    id: partido.id,
    estadoPartido: partido.estadoPartido,
    fechaHora: partido.fechaHoraPartido,
    cancha: partido.cancha
      ? {
          id: partido.cancha.id,
          numero: partido.cancha.numero,
          predioId: partido.cancha.predio.id,
          predio: partido.cancha.predio.nombre,
        }
      : null,
  };
}

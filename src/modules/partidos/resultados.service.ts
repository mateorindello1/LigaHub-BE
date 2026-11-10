import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoTorneo } from '../torneos/estado-torneo.enum.js';
import {
  calcularMarcador,
  marcadorWO,
  type Lado,
  type Marcador,
} from './calcular-marcador.js';
import { CargarResultadoDto, EventoDto } from './dto/cargar-resultado.dto.js';
import { EstadoPartido } from './estado-partido.enum.js';
import {
  PartidosRepository,
  type EventoAGuardar,
  type JugadorDelPlantel,
  type PartidoConPlanilla,
} from './partidos.repository.js';
import type {
  EquipoPlanilla,
  EventoPlanilla,
  PlanillaPartido,
} from './planilla-partido.js';
import { TipoEvento } from './tipo-evento.enum.js';

/**
 * Caso de uso: cargar el resultado de un partido del fixture (lo hace el Asistente el día del
 * partido, o el Administrador). Es el segundo caso de uso de la aprobación directa y usa los
 * partidos que genera el primero (el fixture).
 *
 * Reglas:
 * - El torneo no puede estar finalizado.
 * - Para cargarlo como jugado o W.O., el partido tiene que tener día y hora, y ya haber empezado.
 * - Jugado: los jugadores tienen que estar inscriptos en uno de los dos equipos; los eventos
 *   son de jugadores que jugaron; un cambio es entre dos jugadores distintos del mismo equipo.
 *   El marcador se calcula de los goles: no se envía.
 * - W.O.: se indica el equipo que se presentó, que gana 3 a 0. Sin jugadores ni eventos.
 * - Suspendido: sin jugadores, eventos ni marcador.
 * - Cargar de nuevo reemplaza lo anterior: sirve para corregir.
 *
 * La tabla de posiciones no se toca: se calcula a partir de los partidos, así que se actualiza sola.
 */
@Injectable()
export class ResultadosService {
  constructor(private readonly partidosRepository: PartidosRepository) {}

  /** Devuelve la planilla del partido. Si no existe, responde 404. */
  async obtenerPlanilla(id: string): Promise<PlanillaPartido> {
    const partido = await this.obtenerPartido(id);
    return this.armarPlanilla(partido);
  }

  /**
   * Carga (o reemplaza) el resultado.
   * @param ahora momento actual; se recibe para poder probar la regla "ya empezó".
   */
  async cargar(
    id: string,
    dto: CargarResultadoDto,
    ahora: Date = new Date(),
  ): Promise<PlanillaPartido> {
    // #region Validaciones del partido
    const partido = await this.obtenerPartido(id);
    this.validarTorneoEnCurso(partido);

    const jugadores = dto.jugadores ?? [];
    const eventos = dto.eventos ?? [];
    const estado = dto.estadoPartido;

    if (estado !== EstadoPartido.Suspendido) {
      if (!partido.fechaHoraPartido) {
        throw new ConflictException(
          'Primero hay que programar el día y hora del partido.',
        );
      }
      if (partido.fechaHoraPartido > ahora) {
        throw new ConflictException(
          'El partido todavía no empezó: el resultado se carga desde la hora del partido.',
        );
      }
    }
    // #endregion

    let marcador: Marcador | null = null;
    let eventosAGuardar: EventoAGuardar[] = [];

    if (estado === EstadoPartido.Finalizado) {
      if (dto.equipoGanadorId !== undefined) {
        throw errorDeCampo(
          'equipoGanadorId',
          'El ganador solo se indica en un W.O.: en un partido jugado sale de los goles.',
        );
      }
      const plantel = await this.partidosRepository.obtenerPlanteles(
        partido.fechaFixture.torneo.id,
        [partido.equipoLocal.id, partido.equipoVisitante.id],
      );
      const ladoDe = this.validarJugadores(partido, plantel, jugadores);
      eventosAGuardar = this.validarEventos(eventos, ladoDe);
      marcador = calcularMarcador(
        eventosAGuardar.map((evento) => ({
          tipoEvento: evento.tipoEvento,
          lado: ladoDe.get(evento.inscripcionJugadorId)!,
        })),
      );
    } else {
      if (jugadores.length > 0) {
        throw errorDeCampo(
          'jugadores',
          'Solo un partido jugado lleva la lista de jugadores.',
        );
      }
      if (eventos.length > 0) {
        throw errorDeCampo('eventos', 'Solo un partido jugado lleva eventos.');
      }
      if (estado === EstadoPartido.WO) {
        marcador = marcadorWO(this.validarGanadorWO(partido, dto));
      } else if (dto.equipoGanadorId !== undefined) {
        throw errorDeCampo(
          'equipoGanadorId',
          'Un partido suspendido no tiene ganador.',
        );
      }
    }

    await this.partidosRepository.guardarResultado(id, {
      estadoPartido: estado,
      golesLocal: marcador?.golesLocal ?? null,
      golesVisitante: marcador?.golesVisitante ?? null,
      jugadores,
      eventos: eventosAGuardar,
    });
    return this.obtenerPlanilla(id);
  }

  /** Anula el resultado: el partido vuelve a Programado, sin jugadores, eventos ni marcador. */
  async anular(id: string): Promise<void> {
    const partido = await this.obtenerPartido(id);
    this.validarTorneoEnCurso(partido);
    if (partido.estadoPartido === (EstadoPartido.Programado as number)) {
      throw new ConflictException('El partido no tiene resultado cargado.');
    }
    await this.partidosRepository.anularResultado(id);
  }

  // #region Validaciones

  private async obtenerPartido(id: string): Promise<PartidoConPlanilla> {
    const partido = await this.partidosRepository.obtenerPlanilla(id);
    if (!partido) {
      throw new NotFoundException(`No existe el partido ${id}.`);
    }
    return partido;
  }

  private validarTorneoEnCurso(partido: PartidoConPlanilla): void {
    const torneo = partido.fechaFixture.torneo;
    if (torneo.estadoTorneo === (EstadoTorneo.Finalizado as number)) {
      throw new ConflictException(
        `El torneo "${torneo.nombre}" está finalizado: sus resultados ya no se pueden cambiar.`,
      );
    }
  }

  /**
   * Verifica que cada jugador esté inscripto en uno de los dos equipos (la base no lo puede
   * imponer) y devuelve el lado de cada uno, para los eventos y el marcador.
   */
  private validarJugadores(
    partido: PartidoConPlanilla,
    plantel: JugadorDelPlantel[],
    jugadores: string[],
  ): Map<string, Lado> {
    const ladoEnPlantel = new Map<string, Lado>(
      plantel.map((j) => [
        j.inscripcionJugadorId,
        j.equipoId === partido.equipoLocal.id ? 'local' : 'visitante',
      ]),
    );
    const ladoDe = new Map<string, Lado>();
    for (const inscripcionId of jugadores) {
      const lado = ladoEnPlantel.get(inscripcionId);
      if (!lado) {
        throw errorDeCampo(
          'jugadores',
          'Hay jugadores que no están inscriptos en ninguno de los dos equipos.',
        );
      }
      ladoDe.set(inscripcionId, lado);
    }
    return ladoDe;
  }

  /** Verifica cada evento contra los jugadores que participaron. */
  private validarEventos(
    eventos: EventoDto[],
    ladoDe: Map<string, Lado>,
  ): EventoAGuardar[] {
    return eventos.map((evento, indice) => {
      const campo = `eventos.${indice}`;
      const lado = ladoDe.get(evento.inscripcionJugadorId);
      if (!lado) {
        throw errorDeCampo(
          `${campo}.inscripcionJugadorId`,
          'El jugador del evento no figura entre los que jugaron.',
        );
      }

      const entra = evento.inscripcionJugadorEntraId ?? null;
      if (evento.tipoEvento === TipoEvento.Cambio) {
        if (!entra) {
          throw errorDeCampo(
            `${campo}.inscripcionJugadorEntraId`,
            'En un cambio hay que indicar el jugador que entra.',
          );
        }
        if (entra === evento.inscripcionJugadorId) {
          throw errorDeCampo(
            `${campo}.inscripcionJugadorEntraId`,
            'El jugador que entra tiene que ser otro.',
          );
        }
        if (ladoDe.get(entra) !== lado) {
          throw errorDeCampo(
            `${campo}.inscripcionJugadorEntraId`,
            'El jugador que entra tiene que haber jugado y ser del mismo equipo.',
          );
        }
      } else if (entra) {
        throw errorDeCampo(
          `${campo}.inscripcionJugadorEntraId`,
          'Solo un cambio lleva un jugador que entra.',
        );
      }

      return {
        tipoEvento: evento.tipoEvento,
        minuto: evento.minuto,
        inscripcionJugadorId: evento.inscripcionJugadorId,
        inscripcionJugadorEntraId: entra,
      };
    });
  }

  /** En un W.O., el ganador es obligatorio y tiene que ser uno de los dos equipos. */
  private validarGanadorWO(
    partido: PartidoConPlanilla,
    dto: CargarResultadoDto,
  ): Lado {
    if (dto.equipoGanadorId === partido.equipoLocal.id) return 'local';
    if (dto.equipoGanadorId === partido.equipoVisitante.id) return 'visitante';
    throw errorDeCampo(
      'equipoGanadorId',
      'En un W.O. hay que indicar cuál de los dos equipos se presentó.',
    );
  }
  // #endregion

  /** Arma la planilla: los planteles con la marca "jugó" y los eventos por minuto. */
  private async armarPlanilla(
    partido: PartidoConPlanilla,
  ): Promise<PlanillaPartido> {
    const plantel = await this.partidosRepository.obtenerPlanteles(
      partido.fechaFixture.torneo.id,
      [partido.equipoLocal.id, partido.equipoVisitante.id],
    );
    const jugaron = new Set(
      partido.partidoJugadores.map((pj) => pj.inscripcionJugadorId),
    );

    const equipo = (
      datos: PartidoConPlanilla['equipoLocal'],
    ): EquipoPlanilla => ({
      ...datos,
      plantel: plantel
        .filter((j) => j.equipoId === datos.id)
        .map((j) => ({
          inscripcionJugadorId: j.inscripcionJugadorId,
          jugadorId: j.jugador.id,
          nombres: j.jugador.nombres,
          apellidos: j.jugador.apellidos,
          dorsal: j.dorsal,
          capitan: j.capitan,
          jugo: jugaron.has(j.inscripcionJugadorId),
        })),
    });

    const eventos: EventoPlanilla[] = partido.partidoJugadores
      .flatMap((pj) =>
        pj.eventos.map((evento) => ({
          id: evento.id,
          tipoEvento: evento.tipoEvento,
          minuto: evento.minuto,
          inscripcionJugadorId: pj.inscripcionJugadorId,
          inscripcionJugadorEntraId:
            evento.partidoJugadorCambio?.inscripcionJugadorId ?? null,
        })),
      )
      .sort((a, b) => a.minuto - b.minuto);

    return {
      id: partido.id,
      estadoPartido: partido.estadoPartido,
      fechaHora: partido.fechaHoraPartido,
      numeroFecha: partido.fechaFixture.numeroFecha,
      torneo: partido.fechaFixture.torneo,
      cancha: partido.cancha
        ? {
            numero: partido.cancha.numero,
            predio: partido.cancha.predio.nombre,
          }
        : null,
      golesLocal: partido.cantidadGolesLocal,
      golesVisitante: partido.cantidadGolesVisitante,
      local: equipo(partido.equipoLocal),
      visitante: equipo(partido.equipoVisitante),
      eventos,
    };
  }
}

/** Error 400 con el mismo formato que el de la validación de los DTO (detalle por campo). */
function errorDeCampo(campo: string, mensaje: string): BadRequestException {
  return new BadRequestException({
    mensaje: 'Los datos enviados no son válidos.',
    detalles: [{ campo, mensajes: [mensaje] }],
  });
}

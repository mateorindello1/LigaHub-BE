import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InscripcionesEquipoService } from '../inscripciones-equipo/inscripciones-equipo.service.js';
import { JugadoresService } from '../jugadores/jugadores.service.js';
import { EstadoTorneo } from '../torneos/estado-torneo.enum.js';
import { TorneosService } from '../torneos/torneos.service.js';
import { CrearInscripcionJugadorDto } from './dto/crear-inscripcion-jugador.dto.js';
import { ModificarInscripcionJugadorDto } from './dto/modificar-inscripcion-jugador.dto.js';
import {
  InscripcionesJugadorRepository,
  type InscripcionJugadorConJugador,
} from './inscripciones-jugador.repository.js';

/**
 * Casos de uso de inscripciones de jugadores en el equipo de un torneo (CRUD dependiente:
 * cuelga de la inscripción del equipo y referencia a Jugador).
 *
 * Reglas:
 * - El torneo no puede estar finalizado. A diferencia de los equipos, los jugadores se pueden
 *   sumar o cambiar con el torneo en curso (un equipo incorpora un jugador a mitad del torneo).
 * - Un jugador no puede estar en dos equipos del mismo torneo.
 * - El dorsal no se repite dentro del equipo.
 * - Un solo capitán por equipo: al marcar uno nuevo, el anterior deja de serlo.
 * - No se da de baja a un jugador que ya jugó partidos con ese equipo.
 */
@Injectable()
export class InscripcionesJugadorService {
  constructor(
    private readonly inscripcionesRepository: InscripcionesJugadorRepository,
    private readonly torneosService: TorneosService,
    private readonly inscripcionesEquipoService: InscripcionesEquipoService,
    private readonly jugadoresService: JugadoresService,
  ) {}

  /** Devuelve los jugadores del equipo inscripto. Si la inscripción no existe en el torneo, responde 404. */
  async obtenerPorInscripcionEquipo(
    torneoId: number,
    inscripcionEquipoId: string,
  ): Promise<InscripcionJugadorConJugador[]> {
    await this.inscripcionesEquipoService.obtenerPorId(
      torneoId,
      inscripcionEquipoId,
    );
    return this.inscripcionesRepository.obtenerPorInscripcionEquipo(
      inscripcionEquipoId,
    );
  }

  /** Devuelve la inscripción de un jugador. Si no existe en ese equipo y torneo, responde 404. */
  async obtenerPorId(
    torneoId: number,
    inscripcionEquipoId: string,
    id: string,
  ): Promise<InscripcionJugadorConJugador> {
    await this.inscripcionesEquipoService.obtenerPorId(
      torneoId,
      inscripcionEquipoId,
    );

    const inscripcion = await this.inscripcionesRepository.obtenerPorId(
      inscripcionEquipoId,
      id,
    );
    if (!inscripcion) {
      throw new NotFoundException(
        `No existe la inscripción de jugador ${id} en este equipo.`,
      );
    }
    return inscripcion;
  }

  /** Inscribe un jugador en el equipo. */
  async crear(
    torneoId: number,
    inscripcionEquipoId: string,
    dto: CrearInscripcionJugadorDto,
  ): Promise<InscripcionJugadorConJugador> {
    await this.validarTorneoModificable(torneoId);
    await this.inscripcionesEquipoService.obtenerPorId(
      torneoId,
      inscripcionEquipoId,
    );
    const jugador = await this.jugadoresService.obtenerPorId(dto.jugadorId);

    const equipoActual =
      await this.inscripcionesRepository.equipoDelJugadorEnTorneo(
        torneoId,
        jugador.id,
      );
    if (equipoActual) {
      throw new ConflictException(
        `${jugador.nombres} ${jugador.apellidos} ya está inscripto en "${equipoActual}" en este torneo.`,
      );
    }
    await this.validarDorsalLibre(inscripcionEquipoId, dto.dorsal);

    return this.inscripcionesRepository.crear(inscripcionEquipoId, jugador.id, {
      dorsal: dto.dorsal,
      capitan: dto.capitan ?? false,
    });
  }

  /** Modifica el dorsal o la capitanía de un jugador inscripto. */
  async modificar(
    torneoId: number,
    inscripcionEquipoId: string,
    id: string,
    dto: ModificarInscripcionJugadorDto,
  ): Promise<InscripcionJugadorConJugador> {
    await this.validarTorneoModificable(torneoId);
    const actual = await this.obtenerPorId(torneoId, inscripcionEquipoId, id);

    const dorsal = dto.dorsal ?? actual.dorsal;
    if (dorsal !== actual.dorsal) {
      await this.validarDorsalLibre(inscripcionEquipoId, dorsal, id);
    }

    return this.inscripcionesRepository.modificar(inscripcionEquipoId, id, {
      dorsal,
      capitan: dto.capitan ?? actual.capitan,
    });
  }

  /** Da de baja a un jugador del equipo. No se permite si ya jugó partidos con él. */
  async borrar(
    torneoId: number,
    inscripcionEquipoId: string,
    id: string,
  ): Promise<void> {
    await this.validarTorneoModificable(torneoId);
    await this.obtenerPorId(torneoId, inscripcionEquipoId, id);

    if (await this.inscripcionesRepository.jugoPartidos(id)) {
      throw new ConflictException(
        'No se puede dar de baja a un jugador que ya jugó partidos con este equipo.',
      );
    }

    await this.inscripcionesRepository.borrar(id);
  }

  /** Verifica que el torneo exista y no esté finalizado. */
  private async validarTorneoModificable(torneoId: number): Promise<void> {
    const torneo = await this.torneosService.obtenerPorId(torneoId);
    if (torneo.estadoTorneo === (EstadoTorneo.Finalizado as number)) {
      throw new ConflictException(
        `El torneo "${torneo.nombre}" está finalizado: sus planteles ya no se pueden modificar.`,
      );
    }
  }

  /**
   * Verifica que el dorsal no lo use otro jugador del equipo.
   * La clave única de la base también lo impide, pero así el mensaje es más claro.
   */
  private async validarDorsalLibre(
    inscripcionEquipoId: string,
    dorsal: number,
    excluirId?: string,
  ): Promise<void> {
    const jugador = await this.inscripcionesRepository.jugadorConDorsal(
      inscripcionEquipoId,
      dorsal,
      excluirId,
    );
    if (jugador) {
      throw new ConflictException(
        `El dorsal ${dorsal} ya lo usa ${jugador} en este equipo.`,
      );
    }
  }
}

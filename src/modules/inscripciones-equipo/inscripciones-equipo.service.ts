import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EquiposService } from '../equipos/equipos.service.js';
import { EstadoTorneo } from '../torneos/estado-torneo.enum.js';
import { TorneosService } from '../torneos/torneos.service.js';
import { CrearInscripcionEquipoDto } from './dto/crear-inscripcion-equipo.dto.js';
import { ModificarInscripcionEquipoDto } from './dto/modificar-inscripcion-equipo.dto.js';
import {
  InscripcionesEquipoRepository,
  type InscripcionEquipoConEquipo,
} from './inscripciones-equipo.repository.js';

/**
 * Casos de uso de inscripciones de equipos a torneos (CRUD dependiente: referencia a Torneo y a Equipo).
 * Usa los servicios de torneos y equipos para validar que existan, en lugar de consultar sus tablas.
 */
@Injectable()
export class InscripcionesEquipoService {
  constructor(
    private readonly inscripcionesRepository: InscripcionesEquipoRepository,
    private readonly torneosService: TorneosService,
    private readonly equiposService: EquiposService,
  ) {}

  /** Devuelve las inscripciones de un torneo. Si el torneo no existe, responde 404. */
  async obtenerPorTorneo(
    torneoId: number,
  ): Promise<InscripcionEquipoConEquipo[]> {
    await this.torneosService.obtenerPorId(torneoId);
    return this.inscripcionesRepository.obtenerPorTorneo(torneoId);
  }

  /** Devuelve una inscripción del torneo. Si no existe en ese torneo, responde 404. */
  async obtenerPorId(
    torneoId: number,
    id: string,
  ): Promise<InscripcionEquipoConEquipo> {
    await this.torneosService.obtenerPorId(torneoId);

    const inscripcion = await this.inscripcionesRepository.obtenerPorId(
      torneoId,
      id,
    );
    if (!inscripcion) {
      throw new NotFoundException(
        `No existe la inscripción ${id} en el torneo ${torneoId}.`,
      );
    }
    return inscripcion;
  }

  /** Inscribe un equipo en un torneo con las inscripciones abiertas. */
  async crear(
    torneoId: number,
    dto: CrearInscripcionEquipoDto,
  ): Promise<InscripcionEquipoConEquipo> {
    await this.validarInscripcionesAbiertas(torneoId);
    const equipo = await this.equiposService.obtenerPorId(dto.equipoId);
    await this.validarNoInscripto(torneoId, equipo.id, equipo.nombre);

    return this.inscripcionesRepository.crear(torneoId, equipo.id);
  }

  /** Cambia el equipo de una inscripción, mientras las inscripciones sigan abiertas. */
  async modificar(
    torneoId: number,
    id: string,
    dto: ModificarInscripcionEquipoDto,
  ): Promise<InscripcionEquipoConEquipo> {
    await this.validarInscripcionesAbiertas(torneoId);
    await this.obtenerPorId(torneoId, id);
    const equipo = await this.equiposService.obtenerPorId(dto.equipoId);
    await this.validarNoInscripto(torneoId, equipo.id, equipo.nombre, id);

    return this.inscripcionesRepository.modificar(id, equipo.id);
  }

  /** Da de baja una inscripción. No se permite si ya tiene jugadores inscriptos. */
  async borrar(torneoId: number, id: string): Promise<void> {
    await this.validarInscripcionesAbiertas(torneoId);
    await this.obtenerPorId(torneoId, id);

    if (await this.inscripcionesRepository.tieneJugadores(id)) {
      throw new ConflictException(
        'No se puede borrar una inscripción que ya tiene jugadores inscriptos.',
      );
    }

    await this.inscripcionesRepository.borrar(id);
  }

  /** Verifica que el torneo exista y esté en estado Inscripcion. */
  private async validarInscripcionesAbiertas(torneoId: number): Promise<void> {
    const torneo = await this.torneosService.obtenerPorId(torneoId);
    if (torneo.estadoTorneo !== (EstadoTorneo.Inscripcion as number)) {
      throw new ConflictException(
        `Las inscripciones del torneo "${torneo.nombre}" están cerradas.`,
      );
    }
  }

  /**
   * Verifica que el equipo no esté ya inscripto en el torneo.
   * La clave única de la base también lo impide, pero así el mensaje es más claro.
   */
  private async validarNoInscripto(
    torneoId: number,
    equipoId: number,
    nombreEquipo: string,
    excluirId?: string,
  ): Promise<void> {
    if (
      await this.inscripcionesRepository.existe(torneoId, equipoId, excluirId)
    ) {
      throw new ConflictException(
        `El equipo "${nombreEquipo}" ya está inscripto en este torneo.`,
      );
    }
  }
}

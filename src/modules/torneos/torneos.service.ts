import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Torneo } from '../../generated/prisma/client.js';
import { CrearTorneoDto } from './dto/crear-torneo.dto.js';
import { ModificarTorneoDto } from './dto/modificar-torneo.dto.js';
import { EstadoTorneo } from './estado-torneo.enum.js';
import { TorneosRepository } from './torneos.repository.js';

/**
 * Casos de uso de torneos y sus reglas de negocio.
 * No accede a la base directamente: lo hace a través del repositorio.
 */
@Injectable()
export class TorneosService {
  constructor(private readonly torneosRepository: TorneosRepository) {}

  /** Devuelve todos los torneos. */
  obtenerTodos(): Promise<Torneo[]> {
    return this.torneosRepository.obtenerTodos();
  }

  /** Devuelve un torneo. Si no existe, responde 404. */
  async obtenerPorId(id: number): Promise<Torneo> {
    const torneo = await this.torneosRepository.obtenerPorId(id);
    if (!torneo) {
      throw new NotFoundException(`No existe el torneo ${id}.`);
    }
    return torneo;
  }

  /** Crea un torneo. Todo torneo empieza en estado Inscripcion. */
  crear(dto: CrearTorneoDto): Promise<Torneo> {
    return this.torneosRepository.crear({
      nombre: dto.nombre,
      anio: dto.anio,
      estadoTorneo: EstadoTorneo.Inscripcion,
    });
  }

  /** Modifica el nombre o el año de un torneo existente. */
  async modificar(id: number, dto: ModificarTorneoDto): Promise<Torneo> {
    // Verifica que exista antes de modificar, para responder 404 y no un error de la base.
    await this.obtenerPorId(id);

    return this.torneosRepository.modificar(id, {
      nombre: dto.nombre,
      anio: dto.anio,
    });
  }

  /** Borra un torneo. No se permite si ya tiene equipos inscriptos o fixture generado. */
  async borrar(id: number): Promise<void> {
    await this.obtenerPorId(id);

    if (await this.torneosRepository.tieneDatosAsociados(id)) {
      throw new ConflictException(
        'No se puede borrar un torneo con equipos inscriptos o fixture generado.',
      );
    }

    await this.torneosRepository.borrar(id);
  }
}

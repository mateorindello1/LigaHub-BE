import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CrearPredioDto } from './dto/crear-predio.dto.js';
import { ModificarPredioDto } from './dto/modificar-predio.dto.js';
import {
  PrediosRepository,
  type PredioConCanchas,
} from './predios.repository.js';

/**
 * Casos de uso de predios.
 *
 * Reglas:
 * - El nombre no se repite: es lo que se muestra en el fixture para identificar dónde se juega.
 * - No se borra un predio con canchas: primero se borran sus canchas (que a su vez no pueden
 *   tener partidos asignados).
 */
@Injectable()
export class PrediosService {
  constructor(private readonly prediosRepository: PrediosRepository) {}

  /** Devuelve todos los predios con sus canchas. */
  obtenerTodos(): Promise<PredioConCanchas[]> {
    return this.prediosRepository.obtenerTodos();
  }

  /** Devuelve un predio. Si no existe, responde 404. Lo usa también el módulo de canchas. */
  async obtenerPorId(id: number): Promise<PredioConCanchas> {
    const predio = await this.prediosRepository.obtenerPorId(id);
    if (!predio) {
      throw new NotFoundException(`No existe el predio ${id}.`);
    }
    return predio;
  }

  /** Crea un predio. El nombre no puede repetirse. */
  async crear(dto: CrearPredioDto): Promise<PredioConCanchas> {
    await this.validarNombreDisponible(dto.nombre);
    return this.prediosRepository.crear({
      nombre: dto.nombre,
      direccion: dto.direccion,
    });
  }

  /** Modifica el nombre o la dirección de un predio. */
  async modificar(
    id: number,
    dto: ModificarPredioDto,
  ): Promise<PredioConCanchas> {
    await this.obtenerPorId(id);
    if (dto.nombre !== undefined) {
      await this.validarNombreDisponible(dto.nombre, id);
    }
    return this.prediosRepository.modificar(id, {
      nombre: dto.nombre,
      direccion: dto.direccion,
    });
  }

  /** Borra un predio sin canchas. */
  async borrar(id: number): Promise<void> {
    const predio = await this.obtenerPorId(id);
    if (predio.canchas.length > 0) {
      throw new ConflictException(
        `No se puede borrar el predio "${predio.nombre}" porque tiene canchas. Primero hay que borrarlas.`,
      );
    }
    await this.prediosRepository.borrar(id);
  }

  /** Verifica que no haya otro predio con el mismo nombre. */
  private async validarNombreDisponible(
    nombre: string,
    excluirId?: number,
  ): Promise<void> {
    if (await this.prediosRepository.existeConNombre(nombre, excluirId)) {
      throw new ConflictException(`Ya existe un predio llamado "${nombre}".`);
    }
  }
}

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Cancha } from '../../generated/prisma/client.js';
import { PrediosService } from '../predios/predios.service.js';
import { CanchasRepository } from './canchas.repository.js';
import { CrearCanchaDto } from './dto/crear-cancha.dto.js';
import { ModificarCanchaDto } from './dto/modificar-cancha.dto.js';

/**
 * Casos de uso de canchas (CRUD dependiente: cada cancha pertenece a un predio).
 *
 * Reglas:
 * - El número de cancha no se repite dentro del predio (la base también lo impide).
 * - No se borra una cancha con partidos asignados: el fixture quedaría apuntando a una cancha que
 *   no existe. Primero hay que cambiarles la cancha a esos partidos.
 */
@Injectable()
export class CanchasService {
  constructor(
    private readonly canchasRepository: CanchasRepository,
    private readonly prediosService: PrediosService,
  ) {}

  /** Devuelve las canchas del predio. Si el predio no existe, responde 404. */
  async obtenerPorPredio(predioId: number): Promise<Cancha[]> {
    await this.prediosService.obtenerPorId(predioId);
    return this.canchasRepository.obtenerPorPredio(predioId);
  }

  /** Devuelve una cancha del predio. Si no existe en ese predio, responde 404. */
  async obtenerPorId(predioId: number, id: number): Promise<Cancha> {
    await this.prediosService.obtenerPorId(predioId);
    const cancha = await this.canchasRepository.obtenerPorId(predioId, id);
    if (!cancha) {
      throw new NotFoundException(
        `No existe la cancha ${id} en el predio ${predioId}.`,
      );
    }
    return cancha;
  }

  /** Crea una cancha en el predio. */
  async crear(predioId: number, dto: CrearCanchaDto): Promise<Cancha> {
    await this.prediosService.obtenerPorId(predioId);
    await this.validarNumeroDisponible(predioId, dto.numero);
    return this.canchasRepository.crear(predioId, {
      numero: dto.numero,
      descripcion: dto.descripcion,
    });
  }

  /** Modifica el número o la descripción de una cancha. */
  async modificar(
    predioId: number,
    id: number,
    dto: ModificarCanchaDto,
  ): Promise<Cancha> {
    await this.obtenerPorId(predioId, id);
    if (dto.numero !== undefined) {
      await this.validarNumeroDisponible(predioId, dto.numero, id);
    }
    return this.canchasRepository.modificar(id, {
      numero: dto.numero,
      descripcion: dto.descripcion,
    });
  }

  /** Borra una cancha sin partidos asignados. */
  async borrar(predioId: number, id: number): Promise<void> {
    const cancha = await this.obtenerPorId(predioId, id);
    const partidos = await this.canchasRepository.contarPartidos(id);
    if (partidos > 0) {
      throw new ConflictException(
        partidos === 1
          ? `No se puede borrar la cancha ${cancha.numero}: tiene 1 partido asignado. Primero hay que cambiarle la cancha en el fixture.`
          : `No se puede borrar la cancha ${cancha.numero}: tiene ${partidos} partidos asignados. Primero hay que cambiarles la cancha en el fixture.`,
      );
    }
    await this.canchasRepository.borrar(id);
  }

  /** Verifica que el predio no tenga otra cancha con el mismo número. */
  private async validarNumeroDisponible(
    predioId: number,
    numero: number,
    excluirId?: number,
  ): Promise<void> {
    if (
      await this.canchasRepository.existeConNumero(predioId, numero, excluirId)
    ) {
      throw new ConflictException(
        `El predio ya tiene una cancha número ${numero}.`,
      );
    }
  }
}

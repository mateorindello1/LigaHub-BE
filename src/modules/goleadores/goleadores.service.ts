import { Injectable } from '@nestjs/common';
import { TorneosService } from '../torneos/torneos.service.js';
import {
  calcularGoleadores,
  type FilaGoleadores,
} from './calcular-goleadores.js';
import { GoleadoresRepository } from './goleadores.repository.js';

/** Tabla de goleadores de un torneo. */
@Injectable()
export class GoleadoresService {
  constructor(
    private readonly goleadoresRepository: GoleadoresRepository,
    private readonly torneosService: TorneosService,
  ) {}

  /** Goleadores del torneo. Si el torneo no existe, responde 404. */
  async obtener(torneoId: number): Promise<FilaGoleadores[]> {
    await this.torneosService.obtenerPorId(torneoId);
    const participaciones =
      await this.goleadoresRepository.obtenerParticipaciones(torneoId);
    return calcularGoleadores(participaciones);
  }
}

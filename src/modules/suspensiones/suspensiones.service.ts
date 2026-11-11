import { Injectable } from '@nestjs/common';
import { EstadoPartido } from '../partidos/estado-partido.enum.js';
import { TorneosService } from '../torneos/torneos.service.js';
import {
  calcularSuspensiones,
  suspendidosEnPartido,
  type Suspensiones,
} from './calcular-suspensiones.js';
import { SuspensionesRepository } from './suspensiones.repository.js';

/**
 * Caso de uso: calcular las suspensiones a partir de las tarjetas de cada partido. Lo usan el
 * listado de suspensiones y la carga del resultado, que no deja anotar a un jugador suspendido.
 */
@Injectable()
export class SuspensionesService {
  constructor(
    private readonly suspensionesRepository: SuspensionesRepository,
    private readonly torneosService: TorneosService,
  ) {}

  /** Sanciones y tarjetas del torneo. Si el torneo no existe, responde 404. */
  async obtener(torneoId: number): Promise<Suspensiones> {
    await this.torneosService.obtenerPorId(torneoId);
    return this.calcular(torneoId);
  }

  /**
   * Inscripciones de los jugadores que no pueden jugar el partido. El partido se considera jugable
   * aunque hoy figure como suspendido: es lo que se está por cargar.
   */
  async suspendidosEn(
    torneoId: number,
    partidoId: string,
  ): Promise<Set<string>> {
    const suspensiones = await this.calcular(torneoId, partidoId);
    return suspendidosEnPartido(suspensiones, partidoId);
  }

  private async calcular(
    torneoId: number,
    partidoAJugarId?: string,
  ): Promise<Suspensiones> {
    // Los partidos y las tarjetas son independientes: se consultan en paralelo.
    const [partidos, tarjetas] = await Promise.all([
      this.suspensionesRepository.obtenerPartidos(torneoId),
      this.suspensionesRepository.obtenerTarjetas(torneoId),
    ]);
    const conPartidoAJugar = partidos.map((partido) =>
      partido.id === partidoAJugarId &&
      partido.estadoPartido === (EstadoPartido.Suspendido as number)
        ? { ...partido, estadoPartido: EstadoPartido.Programado }
        : partido,
    );
    return calcularSuspensiones(conPartidoAJugar, tarjetas);
  }
}

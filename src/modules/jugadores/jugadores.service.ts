import { Injectable } from '@nestjs/common';
import {
  JugadoresRepository,
  type JugadorResumen,
} from './jugadores.repository.js';

/** Casos de uso de jugadores. Por ahora solo el listado; el CRUD completo se agrega en AD-2. */
@Injectable()
export class JugadoresService {
  constructor(private readonly jugadoresRepository: JugadoresRepository) {}

  /** Devuelve los jugadores con su usuario asociado, si lo tienen. */
  obtenerResumen(): Promise<JugadorResumen[]> {
    return this.jugadoresRepository.obtenerResumen();
  }
}

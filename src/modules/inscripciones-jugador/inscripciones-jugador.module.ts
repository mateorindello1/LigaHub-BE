import { Module } from '@nestjs/common';
import { InscripcionesEquipoModule } from '../inscripciones-equipo/inscripciones-equipo.module.js';
import { JugadoresModule } from '../jugadores/jugadores.module.js';
import { TorneosModule } from '../torneos/torneos.module.js';
import { InscripcionesJugadorController } from './inscripciones-jugador.controller.js';
import { InscripcionesJugadorRepository } from './inscripciones-jugador.repository.js';
import { InscripcionesJugadorService } from './inscripciones-jugador.service.js';

/**
 * Módulo de inscripciones de jugadores. Importa los módulos de torneos, inscripciones de equipos
 * y jugadores para usar sus servicios.
 */
@Module({
  imports: [TorneosModule, InscripcionesEquipoModule, JugadoresModule],
  controllers: [InscripcionesJugadorController],
  providers: [InscripcionesJugadorService, InscripcionesJugadorRepository],
})
export class InscripcionesJugadorModule {}

import { Module } from '@nestjs/common';
import { TorneosModule } from '../torneos/torneos.module.js';
import { PosicionesController } from './posiciones.controller.js';
import { PosicionesRepository } from './posiciones.repository.js';
import { PosicionesService } from './posiciones.service.js';

/** Módulo de la tabla de posiciones y el detalle de equipo por torneo. */
@Module({
  imports: [TorneosModule],
  controllers: [PosicionesController],
  providers: [PosicionesService, PosicionesRepository],
})
export class PosicionesModule {}

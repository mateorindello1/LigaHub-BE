import { Module } from '@nestjs/common';
import { TorneosModule } from '../torneos/torneos.module.js';
import { GoleadoresController } from './goleadores.controller.js';
import { GoleadoresRepository } from './goleadores.repository.js';
import { GoleadoresService } from './goleadores.service.js';

/** Módulo de la tabla de goleadores por torneo. */
@Module({
  imports: [TorneosModule],
  controllers: [GoleadoresController],
  providers: [GoleadoresService, GoleadoresRepository],
})
export class GoleadoresModule {}

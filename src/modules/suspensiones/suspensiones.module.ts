import { Module } from '@nestjs/common';
import { TorneosModule } from '../torneos/torneos.module.js';
import { SuspensionesController } from './suspensiones.controller.js';
import { SuspensionesRepository } from './suspensiones.repository.js';
import { SuspensionesService } from './suspensiones.service.js';

/**
 * Módulo de suspensiones. Exporta el servicio: la carga del resultado (PartidosModule) lo usa para
 * no dejar anotar a un jugador suspendido.
 */
@Module({
  imports: [TorneosModule],
  controllers: [SuspensionesController],
  providers: [SuspensionesService, SuspensionesRepository],
  exports: [SuspensionesService],
})
export class SuspensionesModule {}

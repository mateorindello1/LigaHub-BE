import { Module } from '@nestjs/common';
import { TorneosController } from './torneos.controller.js';
import { TorneosRepository } from './torneos.repository.js';
import { TorneosService } from './torneos.service.js';

/** Módulo de torneos. Exporta el servicio para que otros módulos (inscripciones) lo usen. */
@Module({
  controllers: [TorneosController],
  providers: [TorneosService, TorneosRepository],
  exports: [TorneosService],
})
export class TorneosModule {}

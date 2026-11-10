import { Module } from '@nestjs/common';
import { PrediosController } from './predios.controller.js';
import { PrediosRepository } from './predios.repository.js';
import { PrediosService } from './predios.service.js';

/** Módulo de predios. Exporta el servicio para que lo use el módulo de canchas. */
@Module({
  controllers: [PrediosController],
  providers: [PrediosService, PrediosRepository],
  exports: [PrediosService],
})
export class PrediosModule {}

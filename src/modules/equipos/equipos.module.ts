import { Module } from '@nestjs/common';
import { EquiposController } from './equipos.controller.js';
import { EquiposRepository } from './equipos.repository.js';
import { EquiposService } from './equipos.service.js';

/** Módulo de equipos. Exporta el servicio para que otros módulos (inscripciones) lo usen. */
@Module({
  controllers: [EquiposController],
  providers: [EquiposService, EquiposRepository],
  exports: [EquiposService],
})
export class EquiposModule {}

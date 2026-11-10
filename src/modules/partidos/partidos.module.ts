import { Module } from '@nestjs/common';
import { PartidosController } from './partidos.controller.js';
import { PartidosRepository } from './partidos.repository.js';
import { PartidosService } from './partidos.service.js';

/** Módulo de partidos: por ahora, la programación (cancha y día y hora). */
@Module({
  controllers: [PartidosController],
  providers: [PartidosService, PartidosRepository],
})
export class PartidosModule {}

import { Module } from '@nestjs/common';
import { PartidosController } from './partidos.controller.js';
import { PartidosRepository } from './partidos.repository.js';
import { PartidosService } from './partidos.service.js';
import { ResultadosService } from './resultados.service.js';

/** Módulo de partidos: planilla, programación (cancha y día y hora) y carga del resultado. */
@Module({
  controllers: [PartidosController],
  providers: [PartidosService, ResultadosService, PartidosRepository],
})
export class PartidosModule {}

import { Module } from '@nestjs/common';
import { SuspensionesModule } from '../suspensiones/suspensiones.module.js';
import { PartidosController } from './partidos.controller.js';
import { PartidosRepository } from './partidos.repository.js';
import { PartidosService } from './partidos.service.js';
import { ResultadosService } from './resultados.service.js';

/**
 * Módulo de partidos: planilla, programación (cancha y día y hora) y carga del resultado. Usa las
 * suspensiones para no dejar anotar en la planilla a un jugador suspendido.
 */
@Module({
  imports: [SuspensionesModule],
  controllers: [PartidosController],
  providers: [PartidosService, ResultadosService, PartidosRepository],
})
export class PartidosModule {}

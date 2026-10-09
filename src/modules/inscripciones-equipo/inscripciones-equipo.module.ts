import { Module } from '@nestjs/common';
import { EquiposModule } from '../equipos/equipos.module.js';
import { TorneosModule } from '../torneos/torneos.module.js';
import { InscripcionesEquipoController } from './inscripciones-equipo.controller.js';
import { InscripcionesEquipoRepository } from './inscripciones-equipo.repository.js';
import { InscripcionesEquipoService } from './inscripciones-equipo.service.js';

/**
 * Módulo de inscripciones de equipos. Importa los módulos de torneos y equipos
 * para poder inyectar sus servicios (que esos módulos exportan).
 */
@Module({
  imports: [TorneosModule, EquiposModule],
  controllers: [InscripcionesEquipoController],
  providers: [InscripcionesEquipoService, InscripcionesEquipoRepository],
})
export class InscripcionesEquipoModule {}

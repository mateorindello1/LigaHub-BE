import { Module } from '@nestjs/common';
import { JugadoresController } from './jugadores.controller.js';
import { JugadoresRepository } from './jugadores.repository.js';
import { JugadoresService } from './jugadores.service.js';

/** Módulo de jugadores. Exporta el servicio para que lo usen las inscripciones de jugadores. */
@Module({
  controllers: [JugadoresController],
  providers: [JugadoresService, JugadoresRepository],
  exports: [JugadoresService],
})
export class JugadoresModule {}

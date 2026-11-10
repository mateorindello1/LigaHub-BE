import { Module } from '@nestjs/common';
import { JugadoresController } from './jugadores.controller.js';
import { JugadoresRepository } from './jugadores.repository.js';
import { JugadoresService } from './jugadores.service.js';

/**
 * Módulo de jugadores. Por ahora solo lista los jugadores (para la gestión de usuarios);
 * el CRUD completo se agrega en AD-2.
 */
@Module({
  controllers: [JugadoresController],
  providers: [JugadoresService, JugadoresRepository],
})
export class JugadoresModule {}

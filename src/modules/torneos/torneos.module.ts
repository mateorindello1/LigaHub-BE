import { Module } from '@nestjs/common';
import { TorneosController } from './torneos.controller.js';
import { TorneosRepository } from './torneos.repository.js';
import { TorneosService } from './torneos.service.js';

/** Módulo de torneos: agrupa su controller, servicio y repositorio. */
@Module({
  controllers: [TorneosController],
  providers: [TorneosService, TorneosRepository],
})
export class TorneosModule {}

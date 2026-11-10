import { Module } from '@nestjs/common';
import { PrediosModule } from '../predios/predios.module.js';
import { CanchasController } from './canchas.controller.js';
import { CanchasRepository } from './canchas.repository.js';
import { CanchasService } from './canchas.service.js';

/** Módulo de canchas. Importa el de predios para validar que el predio exista. */
@Module({
  imports: [PrediosModule],
  controllers: [CanchasController],
  providers: [CanchasService, CanchasRepository],
})
export class CanchasModule {}

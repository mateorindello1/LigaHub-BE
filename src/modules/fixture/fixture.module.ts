import { Module } from '@nestjs/common';
import { TorneosModule } from '../torneos/torneos.module.js';
import { FixtureController } from './fixture.controller.js';
import { FixtureRepository } from './fixture.repository.js';
import { FixtureService } from './fixture.service.js';

/** Módulo del caso de uso de generación del fixture. */
@Module({
  imports: [TorneosModule],
  controllers: [FixtureController],
  providers: [FixtureService, FixtureRepository],
})
export class FixtureModule {}

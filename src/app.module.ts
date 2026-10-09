import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ExcepcionesFilter } from './common/errores/excepciones.filter.js';
import { crearPipeValidacion } from './common/validacion/crear-pipe-validacion.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { TorneosModule } from './modules/torneos/torneos.module.js';

@Module({
  imports: [PrismaModule, TorneosModule],
  controllers: [AppController],
  providers: [
    AppService,
    // Validación y manejo de errores globales. Se registran acá y no en main.ts
    // para que también apliquen en los tests end-to-end.
    { provide: APP_PIPE, useFactory: crearPipeValidacion },
    { provide: APP_FILTER, useClass: ExcepcionesFilter },
  ],
})
export class AppModule {}

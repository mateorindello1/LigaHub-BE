import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Publico } from '../../common/seguridad/publico.decorator.js';
import { ParseIdPipe } from '../../common/validacion/parse-id.pipe.js';
import type { Suspensiones } from './calcular-suspensiones.js';
import { SuspensionesService } from './suspensiones.service.js';

/** Suspensiones del torneo, calculadas a partir de las tarjetas de los partidos jugados. */
@ApiTags('Suspensiones')
@Controller('torneos/:torneoId/suspensiones')
export class SuspensionesController {
  constructor(private readonly suspensionesService: SuspensionesService) {}

  /** Sanciones (con los partidos en que se cumplen) y tarjetas de cada jugador. */
  @Publico()
  @Get()
  obtener(
    @Param('torneoId', ParseIdPipe) torneoId: number,
  ): Promise<Suspensiones> {
    return this.suspensionesService.obtener(torneoId);
  }
}

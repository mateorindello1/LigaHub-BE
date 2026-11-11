import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Publico } from '../../common/seguridad/publico.decorator.js';
import { ParseIdPipe } from '../../common/validacion/parse-id.pipe.js';
import type { FilaGoleadores } from './calcular-goleadores.js';
import { GoleadoresService } from './goleadores.service.js';

/** Listado de goleadores, filtrado por torneo. */
@ApiTags('Goleadores')
@Controller('torneos/:torneoId/goleadores')
export class GoleadoresController {
  constructor(private readonly goleadoresService: GoleadoresService) {}

  /** Jugadores con al menos un gol en los partidos jugados del torneo. */
  @Publico()
  @Get()
  obtener(
    @Param('torneoId', ParseIdPipe) torneoId: number,
  ): Promise<FilaGoleadores[]> {
    return this.goleadoresService.obtener(torneoId);
  }
}

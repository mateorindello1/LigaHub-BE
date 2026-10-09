import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Publico } from '../../common/seguridad/publico.decorator.js';
import { ParseIdPipe } from '../../common/validacion/parse-id.pipe.js';
import type { FilaPosiciones } from './calcular-posiciones.js';
import type { DetalleEquipo } from './detalle-equipo.js';
import { PosicionesService } from './posiciones.service.js';

/**
 * Listado con filtro + detalle (requisito de la cátedra):
 * la tabla de posiciones se filtra por torneo y, al elegir un equipo, se pide su detalle.
 */
@ApiTags('Posiciones')
@Controller('torneos/:torneoId')
export class PosicionesController {
  constructor(private readonly posicionesService: PosicionesService) {}

  /** Tabla de posiciones del torneo, calculada con los partidos finalizados o por WO. */
  @Publico()
  @Get('posiciones')
  obtenerPosiciones(
    @Param('torneoId', ParseIdPipe) torneoId: number,
  ): Promise<FilaPosiciones[]> {
    return this.posicionesService.obtenerPosiciones(torneoId);
  }

  /** Detalle del equipo en el torneo: su posición, sus partidos y sus jugadores. */
  @Publico()
  @Get('equipos/:equipoId')
  obtenerDetalleEquipo(
    @Param('torneoId', ParseIdPipe) torneoId: number,
    @Param('equipoId', ParseIdPipe) equipoId: number,
  ): Promise<DetalleEquipo> {
    return this.posicionesService.obtenerDetalleEquipo(torneoId, equipoId);
  }
}

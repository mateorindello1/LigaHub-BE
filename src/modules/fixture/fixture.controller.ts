import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { Publico } from '../../common/seguridad/publico.decorator.js';
import { Rol } from '../../common/seguridad/rol.enum.js';
import { Roles } from '../../common/seguridad/roles.decorator.js';
import { ParseIdPipe } from '../../common/validacion/parse-id.pipe.js';
import { GenerarFixtureDto } from './dto/generar-fixture.dto.js';
import type { FechaFixtureVista } from './fixture-vista.js';
import { FixtureService } from './fixture.service.js';

/** Caso de uso "generar el fixture del torneo" y consulta del fixture. */
@Controller('torneos/:torneoId/fixture')
export class FixtureController {
  constructor(private readonly fixtureService: FixtureService) {}

  /** GET /torneos/:torneoId/fixture: fechas con sus partidos (vacío si no se generó). */
  @Publico()
  @Get()
  obtener(
    @Param('torneoId', ParseIdPipe) torneoId: number,
  ): Promise<FechaFixtureVista[]> {
    return this.fixtureService.obtener(torneoId);
  }

  /** POST /torneos/:torneoId/fixture → 201 con el fixture generado */
  @Roles(Rol.Administrador)
  @Post()
  generar(
    @Param('torneoId', ParseIdPipe) torneoId: number,
    @Body() dto: GenerarFixtureDto,
  ): Promise<FechaFixtureVista[]> {
    return this.fixtureService.generar(torneoId, dto);
  }

  /** DELETE /torneos/:torneoId/fixture → 204: deshace el fixture si no se jugó ningún partido */
  @Roles(Rol.Administrador)
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  deshacer(@Param('torneoId', ParseIdPipe) torneoId: number): Promise<void> {
    return this.fixtureService.deshacer(torneoId);
  }
}

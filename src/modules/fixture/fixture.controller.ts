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
import { ApiTags } from '@nestjs/swagger';
import { Publico } from '../../common/seguridad/publico.decorator.js';
import { Rol } from '../../common/seguridad/rol.enum.js';
import { Roles } from '../../common/seguridad/roles.decorator.js';
import { ParseIdPipe } from '../../common/validacion/parse-id.pipe.js';
import { GenerarFixtureDto } from './dto/generar-fixture.dto.js';
import type { FechaFixtureVista } from './fixture-vista.js';
import { FixtureService } from './fixture.service.js';

/** Caso de uso "generar el fixture del torneo" y consulta del fixture. */
@ApiTags('Fixture')
@Controller('torneos/:torneoId/fixture')
export class FixtureController {
  constructor(private readonly fixtureService: FixtureService) {}

  /** Fechas del fixture con sus partidos y el equipo libre (lista vacía si no se generó). */
  @Publico()
  @Get()
  obtener(
    @Param('torneoId', ParseIdPipe) torneoId: number,
  ): Promise<FechaFixtureVista[]> {
    return this.fixtureService.obtener(torneoId);
  }

  /** Genera el fixture todos contra todos y pasa el torneo a EnCurso. */
  @Roles(Rol.Administrador)
  @Post()
  generar(
    @Param('torneoId', ParseIdPipe) torneoId: number,
    @Body() dto: GenerarFixtureDto,
  ): Promise<FechaFixtureVista[]> {
    return this.fixtureService.generar(torneoId, dto);
  }

  /** Deshace el fixture y vuelve el torneo a Inscripcion, si no se jugó ningún partido. */
  @Roles(Rol.Administrador)
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  deshacer(@Param('torneoId', ParseIdPipe) torneoId: number): Promise<void> {
    return this.fixtureService.deshacer(torneoId);
  }
}

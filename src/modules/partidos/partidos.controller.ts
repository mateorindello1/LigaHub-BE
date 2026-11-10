import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Publico } from '../../common/seguridad/publico.decorator.js';
import { Rol } from '../../common/seguridad/rol.enum.js';
import { Roles } from '../../common/seguridad/roles.decorator.js';
import { ParseUuidPipe } from '../../common/validacion/parse-uuid.pipe.js';
import { CargarResultadoDto } from './dto/cargar-resultado.dto.js';
import { ProgramarPartidoDto } from './dto/programar-partido.dto.js';
import { PartidosService, type PartidoProgramado } from './partidos.service.js';
import type { PlanillaPartido } from './planilla-partido.js';
import { ResultadosService } from './resultados.service.js';

/**
 * Endpoints de partidos. Los partidos se crean al generar el fixture; acá se consulta su
 * planilla, se programan y se carga su resultado.
 */
@ApiTags('Partidos')
@Controller('partidos')
export class PartidosController {
  constructor(
    private readonly partidosService: PartidosService,
    private readonly resultadosService: ResultadosService,
  ) {}

  /**
   * Planilla del partido: equipos con sus planteles (y quién jugó), marcador y eventos.
   * Es pública, como el fixture y los planteles.
   */
  @Publico()
  @Get(':id')
  obtenerPlanilla(
    @Param('id', ParseUuidPipe) id: string,
  ): Promise<PlanillaPartido> {
    return this.resultadosService.obtenerPlanilla(id);
  }

  /**
   * Asigna cancha y día y hora a un partido. Solo cambia lo que se envía; null lo deja
   * "a confirmar". Responde 409 si la cancha o alguno de los equipos ya tiene un partido
   * superpuesto.
   */
  @Roles(Rol.Administrador)
  @Patch(':id/programacion')
  programar(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: ProgramarPartidoDto,
  ): Promise<PartidoProgramado> {
    return this.partidosService.programar(id, dto);
  }

  /**
   * Carga el resultado: jugado (con jugadores y eventos; el marcador se calcula de los goles),
   * W.O. (con el equipo que se presentó) o suspendido. Reemplaza lo que hubiera.
   */
  @Roles(Rol.Asistente, Rol.Administrador)
  @Put(':id/resultado')
  cargarResultado(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: CargarResultadoDto,
  ): Promise<PlanillaPartido> {
    return this.resultadosService.cargar(id, dto);
  }

  /** Anula el resultado: el partido vuelve a Programado. */
  @Roles(Rol.Asistente, Rol.Administrador)
  @Delete(':id/resultado')
  @HttpCode(HttpStatus.NO_CONTENT)
  anularResultado(@Param('id', ParseUuidPipe) id: string): Promise<void> {
    return this.resultadosService.anular(id);
  }
}

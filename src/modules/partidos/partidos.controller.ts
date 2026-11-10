import { Body, Controller, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Rol } from '../../common/seguridad/rol.enum.js';
import { Roles } from '../../common/seguridad/roles.decorator.js';
import { ParseUuidPipe } from '../../common/validacion/parse-uuid.pipe.js';
import { ProgramarPartidoDto } from './dto/programar-partido.dto.js';
import { PartidosService, type PartidoProgramado } from './partidos.service.js';

/**
 * Endpoints de partidos. Los partidos se crean al generar el fixture; acá se programan
 * (y en AD-4 se cargará su resultado).
 */
@ApiTags('Partidos')
@Controller('partidos')
export class PartidosController {
  constructor(private readonly partidosService: PartidosService) {}

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
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Publico } from '../../common/seguridad/publico.decorator.js';
import { Rol } from '../../common/seguridad/rol.enum.js';
import { Roles } from '../../common/seguridad/roles.decorator.js';
import { ParseIdPipe } from '../../common/validacion/parse-id.pipe.js';
import type { Torneo } from '../../generated/prisma/client.js';
import { CrearTorneoDto } from './dto/crear-torneo.dto.js';
import { ModificarTorneoDto } from './dto/modificar-torneo.dto.js';
import { TorneosService } from './torneos.service.js';

/**
 * Endpoints REST de torneos. Solo recibe el pedido, delega en el servicio y devuelve la respuesta.
 */
@ApiTags('Torneos')
@Controller('torneos')
export class TorneosController {
  constructor(private readonly torneosService: TorneosService) {}

  /** Lista los torneos, del año más reciente al más antiguo. */
  @Publico()
  @Get()
  obtenerTodos(): Promise<Torneo[]> {
    return this.torneosService.obtenerTodos();
  }

  /** Devuelve un torneo. */
  @Publico()
  @Get(':id')
  obtenerPorId(@Param('id', ParseIdPipe) id: number): Promise<Torneo> {
    return this.torneosService.obtenerPorId(id);
  }

  /** Crea un torneo en estado Inscripcion. */
  @Roles(Rol.Administrador)
  @Post()
  crear(@Body() dto: CrearTorneoDto): Promise<Torneo> {
    return this.torneosService.crear(dto);
  }

  /** Modifica el nombre o el año de un torneo. */
  @Roles(Rol.Administrador)
  @Patch(':id')
  modificar(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: ModificarTorneoDto,
  ): Promise<Torneo> {
    return this.torneosService.modificar(id, dto);
  }

  /** Borra un torneo sin equipos inscriptos ni fixture. */
  @Roles(Rol.Administrador)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  borrar(@Param('id', ParseIdPipe) id: number): Promise<void> {
    return this.torneosService.borrar(id);
  }
}

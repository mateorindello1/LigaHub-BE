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
import type { Equipo } from '../../generated/prisma/client.js';
import { CrearEquipoDto } from './dto/crear-equipo.dto.js';
import { ModificarEquipoDto } from './dto/modificar-equipo.dto.js';
import { EquiposService } from './equipos.service.js';

/** Endpoints REST de equipos. */
@ApiTags('Equipos')
@Controller('equipos')
export class EquiposController {
  constructor(private readonly equiposService: EquiposService) {}

  /** Lista los equipos por nombre. */
  @Publico()
  @Get()
  obtenerTodos(): Promise<Equipo[]> {
    return this.equiposService.obtenerTodos();
  }

  /** Devuelve un equipo. */
  @Publico()
  @Get(':id')
  obtenerPorId(@Param('id', ParseIdPipe) id: number): Promise<Equipo> {
    return this.equiposService.obtenerPorId(id);
  }

  /** Crea un equipo. El nombre no puede repetirse. */
  @Roles(Rol.Administrador)
  @Post()
  crear(@Body() dto: CrearEquipoDto): Promise<Equipo> {
    return this.equiposService.crear(dto);
  }

  /** Modifica el nombre o el escudo de un equipo ("escudoURL": null quita el escudo). */
  @Roles(Rol.Administrador)
  @Patch(':id')
  modificar(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: ModificarEquipoDto,
  ): Promise<Equipo> {
    return this.equiposService.modificar(id, dto);
  }

  /** Borra un equipo sin inscripciones ni partidos. */
  @Roles(Rol.Administrador)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  borrar(@Param('id', ParseIdPipe) id: number): Promise<void> {
    return this.equiposService.borrar(id);
  }
}

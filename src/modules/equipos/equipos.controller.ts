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
import { Publico } from '../../common/seguridad/publico.decorator.js';
import { Rol } from '../../common/seguridad/rol.enum.js';
import { Roles } from '../../common/seguridad/roles.decorator.js';
import { ParseIdPipe } from '../../common/validacion/parse-id.pipe.js';
import type { Equipo } from '../../generated/prisma/client.js';
import { CrearEquipoDto } from './dto/crear-equipo.dto.js';
import { ModificarEquipoDto } from './dto/modificar-equipo.dto.js';
import { EquiposService } from './equipos.service.js';

/** Endpoints REST de equipos. */
@Controller('equipos')
export class EquiposController {
  constructor(private readonly equiposService: EquiposService) {}

  /** GET /equipos */
  @Publico()
  @Get()
  obtenerTodos(): Promise<Equipo[]> {
    return this.equiposService.obtenerTodos();
  }

  /** GET /equipos/:id */
  @Publico()
  @Get(':id')
  obtenerPorId(@Param('id', ParseIdPipe) id: number): Promise<Equipo> {
    return this.equiposService.obtenerPorId(id);
  }

  /** POST /equipos → 201 con el equipo creado */
  @Roles(Rol.Administrador)
  @Post()
  crear(@Body() dto: CrearEquipoDto): Promise<Equipo> {
    return this.equiposService.crear(dto);
  }

  /** PATCH /equipos/:id → 200 con el equipo modificado */
  @Roles(Rol.Administrador)
  @Patch(':id')
  modificar(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: ModificarEquipoDto,
  ): Promise<Equipo> {
    return this.equiposService.modificar(id, dto);
  }

  /** DELETE /equipos/:id → 204 sin contenido */
  @Roles(Rol.Administrador)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  borrar(@Param('id', ParseIdPipe) id: number): Promise<void> {
    return this.equiposService.borrar(id);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import type { Torneo } from '../../generated/prisma/client.js';
import { CrearTorneoDto } from './dto/crear-torneo.dto.js';
import { ModificarTorneoDto } from './dto/modificar-torneo.dto.js';
import { TorneosService } from './torneos.service.js';

/**
 * Endpoints REST de torneos. Solo recibe el pedido, delega en el servicio y devuelve la respuesta.
 */
@Controller('torneos')
export class TorneosController {
  constructor(private readonly torneosService: TorneosService) {}

  /** GET /torneos */
  @Get()
  obtenerTodos(): Promise<Torneo[]> {
    return this.torneosService.obtenerTodos();
  }

  /** GET /torneos/:id */
  @Get(':id')
  obtenerPorId(@Param('id', ParseIntPipe) id: number): Promise<Torneo> {
    return this.torneosService.obtenerPorId(id);
  }

  /** POST /torneos → 201 con el torneo creado */
  @Post()
  crear(@Body() dto: CrearTorneoDto): Promise<Torneo> {
    return this.torneosService.crear(dto);
  }

  /** PATCH /torneos/:id → 200 con el torneo modificado */
  @Patch(':id')
  modificar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModificarTorneoDto,
  ): Promise<Torneo> {
    return this.torneosService.modificar(id, dto);
  }

  /** DELETE /torneos/:id → 204 sin contenido */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  borrar(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.torneosService.borrar(id);
  }
}

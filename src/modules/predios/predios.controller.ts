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
import { CrearPredioDto } from './dto/crear-predio.dto.js';
import { ModificarPredioDto } from './dto/modificar-predio.dto.js';
import type { PredioConCanchas } from './predios.repository.js';
import { PrediosService } from './predios.service.js';

/**
 * Endpoints REST de predios. La consulta es pública: el fixture ya muestra dónde se juega cada
 * partido. Las altas, modificaciones y bajas son del Administrador.
 */
@ApiTags('Predios')
@Controller('predios')
export class PrediosController {
  constructor(private readonly prediosService: PrediosService) {}

  /** Lista los predios por nombre, cada uno con sus canchas. */
  @Publico()
  @Get()
  obtenerTodos(): Promise<PredioConCanchas[]> {
    return this.prediosService.obtenerTodos();
  }

  /** Devuelve un predio con sus canchas. */
  @Publico()
  @Get(':id')
  obtenerPorId(
    @Param('id', ParseIdPipe) id: number,
  ): Promise<PredioConCanchas> {
    return this.prediosService.obtenerPorId(id);
  }

  /** Crea un predio. El nombre no puede repetirse. */
  @Roles(Rol.Administrador)
  @Post()
  crear(@Body() dto: CrearPredioDto): Promise<PredioConCanchas> {
    return this.prediosService.crear(dto);
  }

  /** Modifica el nombre o la dirección de un predio. */
  @Roles(Rol.Administrador)
  @Patch(':id')
  modificar(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: ModificarPredioDto,
  ): Promise<PredioConCanchas> {
    return this.prediosService.modificar(id, dto);
  }

  /** Borra un predio sin canchas. */
  @Roles(Rol.Administrador)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  borrar(@Param('id', ParseIdPipe) id: number): Promise<void> {
    return this.prediosService.borrar(id);
  }
}

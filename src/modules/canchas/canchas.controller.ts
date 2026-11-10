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
import type { Cancha } from '../../generated/prisma/client.js';
import { CanchasService } from './canchas.service.js';
import { CrearCanchaDto } from './dto/crear-cancha.dto.js';
import { ModificarCanchaDto } from './dto/modificar-cancha.dto.js';

/**
 * Endpoints REST de canchas. Anidados en el predio, porque cada cancha pertenece a uno:
 * /predios/:predioId/canchas.
 */
@ApiTags('Canchas')
@Controller('predios/:predioId/canchas')
export class CanchasController {
  constructor(private readonly canchasService: CanchasService) {}

  /** Lista las canchas del predio por número. */
  @Publico()
  @Get()
  obtenerPorPredio(
    @Param('predioId', ParseIdPipe) predioId: number,
  ): Promise<Cancha[]> {
    return this.canchasService.obtenerPorPredio(predioId);
  }

  /** Devuelve una cancha del predio. */
  @Publico()
  @Get(':id')
  obtenerPorId(
    @Param('predioId', ParseIdPipe) predioId: number,
    @Param('id', ParseIdPipe) id: number,
  ): Promise<Cancha> {
    return this.canchasService.obtenerPorId(predioId, id);
  }

  /** Crea una cancha en el predio. El número no puede repetirse en el predio. */
  @Roles(Rol.Administrador)
  @Post()
  crear(
    @Param('predioId', ParseIdPipe) predioId: number,
    @Body() dto: CrearCanchaDto,
  ): Promise<Cancha> {
    return this.canchasService.crear(predioId, dto);
  }

  /** Modifica el número o la descripción de una cancha. */
  @Roles(Rol.Administrador)
  @Patch(':id')
  modificar(
    @Param('predioId', ParseIdPipe) predioId: number,
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: ModificarCanchaDto,
  ): Promise<Cancha> {
    return this.canchasService.modificar(predioId, id, dto);
  }

  /** Borra una cancha sin partidos asignados. */
  @Roles(Rol.Administrador)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  borrar(
    @Param('predioId', ParseIdPipe) predioId: number,
    @Param('id', ParseIdPipe) id: number,
  ): Promise<void> {
    return this.canchasService.borrar(predioId, id);
  }
}

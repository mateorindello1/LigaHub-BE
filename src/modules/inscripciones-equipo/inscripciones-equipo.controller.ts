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
import { ParseUuidPipe } from '../../common/validacion/parse-uuid.pipe.js';
import { CrearInscripcionEquipoDto } from './dto/crear-inscripcion-equipo.dto.js';
import { ModificarInscripcionEquipoDto } from './dto/modificar-inscripcion-equipo.dto.js';
import type { InscripcionEquipoConEquipo } from './inscripciones-equipo.repository.js';
import { InscripcionesEquipoService } from './inscripciones-equipo.service.js';

/**
 * Endpoints REST de inscripciones de equipos. Anidados en el torneo, porque una inscripción
 * pertenece a un torneo: /torneos/:torneoId/inscripciones.
 */
@Controller('torneos/:torneoId/inscripciones')
export class InscripcionesEquipoController {
  constructor(
    private readonly inscripcionesService: InscripcionesEquipoService,
  ) {}

  /** GET /torneos/:torneoId/inscripciones */
  @Publico()
  @Get()
  obtenerPorTorneo(
    @Param('torneoId', ParseIdPipe) torneoId: number,
  ): Promise<InscripcionEquipoConEquipo[]> {
    return this.inscripcionesService.obtenerPorTorneo(torneoId);
  }

  /** GET /torneos/:torneoId/inscripciones/:id */
  @Publico()
  @Get(':id')
  obtenerPorId(
    @Param('torneoId', ParseIdPipe) torneoId: number,
    @Param('id', ParseUuidPipe) id: string,
  ): Promise<InscripcionEquipoConEquipo> {
    return this.inscripcionesService.obtenerPorId(torneoId, id);
  }

  /** POST /torneos/:torneoId/inscripciones → 201 con la inscripción creada */
  @Roles(Rol.Administrador)
  @Post()
  crear(
    @Param('torneoId', ParseIdPipe) torneoId: number,
    @Body() dto: CrearInscripcionEquipoDto,
  ): Promise<InscripcionEquipoConEquipo> {
    return this.inscripcionesService.crear(torneoId, dto);
  }

  /** PATCH /torneos/:torneoId/inscripciones/:id → 200 con la inscripción modificada */
  @Roles(Rol.Administrador)
  @Patch(':id')
  modificar(
    @Param('torneoId', ParseIdPipe) torneoId: number,
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: ModificarInscripcionEquipoDto,
  ): Promise<InscripcionEquipoConEquipo> {
    return this.inscripcionesService.modificar(torneoId, id, dto);
  }

  /** DELETE /torneos/:torneoId/inscripciones/:id → 204 sin contenido */
  @Roles(Rol.Administrador)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  borrar(
    @Param('torneoId', ParseIdPipe) torneoId: number,
    @Param('id', ParseUuidPipe) id: string,
  ): Promise<void> {
    return this.inscripcionesService.borrar(torneoId, id);
  }
}

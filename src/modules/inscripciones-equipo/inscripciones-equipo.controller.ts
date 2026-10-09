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
import { ParseUuidPipe } from '../../common/validacion/parse-uuid.pipe.js';
import { CrearInscripcionEquipoDto } from './dto/crear-inscripcion-equipo.dto.js';
import { ModificarInscripcionEquipoDto } from './dto/modificar-inscripcion-equipo.dto.js';
import type { InscripcionEquipoConEquipo } from './inscripciones-equipo.repository.js';
import { InscripcionesEquipoService } from './inscripciones-equipo.service.js';

/**
 * Endpoints REST de inscripciones de equipos. Anidados en el torneo, porque una inscripción
 * pertenece a un torneo: /torneos/:torneoId/inscripciones.
 */
@ApiTags('Inscripciones de equipos')
@Controller('torneos/:torneoId/inscripciones')
export class InscripcionesEquipoController {
  constructor(
    private readonly inscripcionesService: InscripcionesEquipoService,
  ) {}

  /** Lista los equipos inscriptos en el torneo. */
  @Publico()
  @Get()
  obtenerPorTorneo(
    @Param('torneoId', ParseIdPipe) torneoId: number,
  ): Promise<InscripcionEquipoConEquipo[]> {
    return this.inscripcionesService.obtenerPorTorneo(torneoId);
  }

  /** Devuelve una inscripción del torneo. */
  @Publico()
  @Get(':id')
  obtenerPorId(
    @Param('torneoId', ParseIdPipe) torneoId: number,
    @Param('id', ParseUuidPipe) id: string,
  ): Promise<InscripcionEquipoConEquipo> {
    return this.inscripcionesService.obtenerPorId(torneoId, id);
  }

  /** Inscribe un equipo en un torneo con las inscripciones abiertas. */
  @Roles(Rol.Administrador)
  @Post()
  crear(
    @Param('torneoId', ParseIdPipe) torneoId: number,
    @Body() dto: CrearInscripcionEquipoDto,
  ): Promise<InscripcionEquipoConEquipo> {
    return this.inscripcionesService.crear(torneoId, dto);
  }

  /** Cambia el equipo de una inscripción (solo con las inscripciones abiertas). */
  @Roles(Rol.Administrador)
  @Patch(':id')
  modificar(
    @Param('torneoId', ParseIdPipe) torneoId: number,
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: ModificarInscripcionEquipoDto,
  ): Promise<InscripcionEquipoConEquipo> {
    return this.inscripcionesService.modificar(torneoId, id, dto);
  }

  /** Da de baja una inscripción sin jugadores (solo con las inscripciones abiertas). */
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

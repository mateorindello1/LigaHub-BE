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
import { CrearInscripcionJugadorDto } from './dto/crear-inscripcion-jugador.dto.js';
import { ModificarInscripcionJugadorDto } from './dto/modificar-inscripcion-jugador.dto.js';
import type { InscripcionJugadorConJugador } from './inscripciones-jugador.repository.js';
import { InscripcionesJugadorService } from './inscripciones-jugador.service.js';

/**
 * Endpoints REST de inscripciones de jugadores: el plantel de un equipo en un torneo. Anidados en
 * la inscripción del equipo, porque cada jugador se inscribe en ella:
 * /torneos/:torneoId/inscripciones/:inscripcionId/jugadores.
 */
@ApiTags('Inscripciones de jugadores')
@Controller('torneos/:torneoId/inscripciones/:inscripcionId/jugadores')
export class InscripcionesJugadorController {
  constructor(
    private readonly inscripcionesService: InscripcionesJugadorService,
  ) {}

  /** Lista el plantel del equipo (dorsal, capitán y nombre; sin datos personales). */
  @Publico()
  @Get()
  obtenerPorInscripcionEquipo(
    @Param('torneoId', ParseIdPipe) torneoId: number,
    @Param('inscripcionId', ParseUuidPipe) inscripcionId: string,
  ): Promise<InscripcionJugadorConJugador[]> {
    return this.inscripcionesService.obtenerPorInscripcionEquipo(
      torneoId,
      inscripcionId,
    );
  }

  /** Devuelve la inscripción de un jugador del equipo. */
  @Publico()
  @Get(':id')
  obtenerPorId(
    @Param('torneoId', ParseIdPipe) torneoId: number,
    @Param('inscripcionId', ParseUuidPipe) inscripcionId: string,
    @Param('id', ParseUuidPipe) id: string,
  ): Promise<InscripcionJugadorConJugador> {
    return this.inscripcionesService.obtenerPorId(torneoId, inscripcionId, id);
  }

  /** Inscribe un jugador en el equipo, con su dorsal y si es el capitán. */
  @Roles(Rol.Administrador)
  @Post()
  crear(
    @Param('torneoId', ParseIdPipe) torneoId: number,
    @Param('inscripcionId', ParseUuidPipe) inscripcionId: string,
    @Body() dto: CrearInscripcionJugadorDto,
  ): Promise<InscripcionJugadorConJugador> {
    return this.inscripcionesService.crear(torneoId, inscripcionId, dto);
  }

  /** Cambia el dorsal o la capitanía de un jugador del equipo. */
  @Roles(Rol.Administrador)
  @Patch(':id')
  modificar(
    @Param('torneoId', ParseIdPipe) torneoId: number,
    @Param('inscripcionId', ParseUuidPipe) inscripcionId: string,
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: ModificarInscripcionJugadorDto,
  ): Promise<InscripcionJugadorConJugador> {
    return this.inscripcionesService.modificar(
      torneoId,
      inscripcionId,
      id,
      dto,
    );
  }

  /** Da de baja a un jugador del equipo (si todavía no jugó partidos). */
  @Roles(Rol.Administrador)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  borrar(
    @Param('torneoId', ParseIdPipe) torneoId: number,
    @Param('inscripcionId', ParseUuidPipe) inscripcionId: string,
    @Param('id', ParseUuidPipe) id: string,
  ): Promise<void> {
    return this.inscripcionesService.borrar(torneoId, inscripcionId, id);
  }
}

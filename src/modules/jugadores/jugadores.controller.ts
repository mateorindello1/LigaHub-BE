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
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Rol } from '../../common/seguridad/rol.enum.js';
import { Roles } from '../../common/seguridad/roles.decorator.js';
import { ParseIdPipe } from '../../common/validacion/parse-id.pipe.js';
import type { UsuarioDeSesion } from '../auth/contenido-token.js';
import { UsuarioActual } from '../auth/usuario-actual.decorator.js';
import { CrearJugadorDto } from './dto/crear-jugador.dto.js';
import { FiltroJugadoresDto } from './dto/filtro-jugadores.dto.js';
import { ModificarJugadorDto } from './dto/modificar-jugador.dto.js';
import type {
  JugadorConInscripciones,
  JugadorConUsuario,
} from './jugadores.repository.js';
import { JugadoresService } from './jugadores.service.js';

/**
 * Endpoints REST de jugadores. Son datos personales (DNI, email, teléfono, dirección): ninguno es
 * público. El Administrador gestiona todos; un usuario con rol Jugador ve y modifica solo el suyo
 * (lo controla el servicio).
 */
@ApiTags('Jugadores')
@Controller('jugadores')
export class JugadoresController {
  constructor(private readonly jugadoresService: JugadoresService) {}

  /**
   * Lista los jugadores con el id de su usuario, si lo tienen.
   * Con ?disponiblesEnTorneo=:id, solo los que todavía se pueden inscribir en ese torneo.
   */
  @Roles(Rol.Administrador)
  @Get()
  obtenerTodos(
    @Query() filtro: FiltroJugadoresDto,
  ): Promise<JugadorConUsuario[]> {
    return this.jugadoresService.obtenerTodos(filtro.disponiblesEnTorneo);
  }

  /** Devuelve un jugador con sus inscripciones. El rol Jugador, solo el propio. */
  @Roles(Rol.Administrador, Rol.Jugador)
  @Get(':id')
  obtenerPorId(
    @Param('id', ParseIdPipe) id: number,
    @UsuarioActual() sesion: UsuarioDeSesion,
  ): Promise<JugadorConInscripciones> {
    return this.jugadoresService.obtenerConInscripciones(id, sesion);
  }

  /** Crea un jugador. El DNI no puede repetirse. */
  @Roles(Rol.Administrador)
  @Post()
  crear(@Body() dto: CrearJugadorDto): Promise<JugadorConUsuario> {
    return this.jugadoresService.crear(dto);
  }

  /**
   * Modifica un jugador. El rol Jugador, solo el propio y solo los datos de contacto
   * (email, teléfono y dirección).
   */
  @Roles(Rol.Administrador, Rol.Jugador)
  @Patch(':id')
  modificar(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: ModificarJugadorDto,
    @UsuarioActual() sesion: UsuarioDeSesion,
  ): Promise<JugadorConUsuario> {
    return this.jugadoresService.modificar(id, dto, sesion);
  }

  /** Borra un jugador sin inscripciones ni usuario asociado. */
  @Roles(Rol.Administrador)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  borrar(@Param('id', ParseIdPipe) id: number): Promise<void> {
    return this.jugadoresService.borrar(id);
  }
}

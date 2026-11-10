import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Rol } from '../../common/seguridad/rol.enum.js';
import { Roles } from '../../common/seguridad/roles.decorator.js';
import type { JugadorResumen } from './jugadores.repository.js';
import { JugadoresService } from './jugadores.service.js';

/**
 * Endpoints de jugadores. Por ahora solo el listado que necesita la gestión de usuarios para
 * asociar un jugador; el CRUD completo se agrega en AD-2.
 * Lo usa solo el Administrador: los jugadores son datos personales.
 */
@ApiTags('Jugadores')
@Controller('jugadores')
export class JugadoresController {
  constructor(private readonly jugadoresService: JugadoresService) {}

  /** Lista los jugadores (id, DNI, nombre) con el usuario asociado si lo tienen. */
  @Roles(Rol.Administrador)
  @Get()
  obtenerTodos(): Promise<JugadorResumen[]> {
    return this.jugadoresService.obtenerResumen();
  }
}

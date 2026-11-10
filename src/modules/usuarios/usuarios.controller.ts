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
import { Rol } from '../../common/seguridad/rol.enum.js';
import { Roles } from '../../common/seguridad/roles.decorator.js';
import { ParseIdPipe } from '../../common/validacion/parse-id.pipe.js';
import type { ContenidoToken } from '../auth/contenido-token.js';
import { UsuarioActual } from '../auth/usuario-actual.decorator.js';
import { CambiarContraseniaDto } from './dto/cambiar-contrasenia.dto.js';
import { CrearUsuarioDto } from './dto/crear-usuario.dto.js';
import { ModificarUsuarioDto } from './dto/modificar-usuario.dto.js';
import type { UsuarioConRoles } from './usuario.js';
import { UsuariosService } from './usuarios.service.js';

/**
 * Gestión de usuarios y roles. Todo el controller es solo para el Administrador.
 * Ninguna respuesta incluye el hash de la contraseña.
 */
@ApiTags('Usuarios')
@Roles(Rol.Administrador)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  /** Lista los usuarios con sus roles y su jugador asociado. */
  @Get()
  obtenerTodos(): Promise<UsuarioConRoles[]> {
    return this.usuariosService.obtenerTodos();
  }

  /** Devuelve un usuario. */
  @Get(':id')
  obtenerPorId(@Param('id', ParseIdPipe) id: number): Promise<UsuarioConRoles> {
    return this.usuariosService.obtenerPorId(id);
  }

  /** Crea un usuario con su contraseña y sus roles. */
  @Post()
  crear(@Body() dto: CrearUsuarioDto): Promise<UsuarioConRoles> {
    return this.usuariosService.crear(dto);
  }

  /** Modifica el email, los roles o el jugador asociado. */
  @Patch(':id')
  modificar(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: ModificarUsuarioDto,
    @UsuarioActual() sesion: ContenidoToken,
  ): Promise<UsuarioConRoles> {
    return this.usuariosService.modificar(id, dto, sesion.sub);
  }

  /** Reemplaza la contraseña de un usuario. */
  @Patch(':id/contrasenia')
  @HttpCode(HttpStatus.NO_CONTENT)
  cambiarContrasenia(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: CambiarContraseniaDto,
  ): Promise<void> {
    return this.usuariosService.cambiarContrasenia(id, dto);
  }

  /** Borra un usuario (no el propio). */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  borrar(
    @Param('id', ParseIdPipe) id: number,
    @UsuarioActual() sesion: ContenidoToken,
  ): Promise<void> {
    return this.usuariosService.borrar(id, sesion.sub);
  }
}

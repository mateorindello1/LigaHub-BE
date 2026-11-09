import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Publico } from '../../common/seguridad/publico.decorator.js';
import type { UsuarioConRoles } from '../usuarios/usuario.js';
import { AuthService, type RespuestaLogin } from './auth.service.js';
import { AutenticacionGuard } from './autenticacion.guard.js';
import type { ContenidoToken } from './contenido-token.js';
import { IniciarSesionDto } from './dto/iniciar-sesion.dto.js';
import { UsuarioActual } from './usuario-actual.decorator.js';

/** Endpoints de autenticación: iniciar sesión y consultar el usuario de la sesión. */
@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Inicia sesión con email y contraseña y devuelve el token de la sesión.
   * Tiene un límite de intentos por IP para frenar ataques de fuerza bruta.
   */
  @Publico()
  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  iniciarSesion(@Body() dto: IniciarSesionDto): Promise<RespuestaLogin> {
    return this.authService.iniciarSesion(dto.email, dto.contrasenia);
  }

  /** Devuelve los datos del usuario de la sesión: email, roles y jugador asociado. */
  @UseGuards(AutenticacionGuard)
  @Get('yo')
  obtenerUsuarioActual(
    @UsuarioActual() usuario: ContenidoToken,
  ): Promise<UsuarioConRoles> {
    return this.authService.obtenerUsuarioActual(usuario.sub);
  }
}

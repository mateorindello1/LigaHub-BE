import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Publico } from '../../common/seguridad/publico.decorator.js';
import type { ConfiguracionSesion } from '../../config/configuracion.js';
import type { UsuarioConRoles } from '../usuarios/usuario.js';
import {
  AuthService,
  CONFIGURACION_SESION,
  type RespuestaLogin,
  type SesionEmitida,
} from './auth.service.js';
import type { ContenidoToken } from './contenido-token.js';
import {
  borrarCookieRefresco,
  escribirCookieRefresco,
  leerCookieRefresco,
} from './cookie-refresco.js';
import { IniciarSesionDto } from './dto/iniciar-sesion.dto.js';
import { UsuarioActual } from './usuario-actual.decorator.js';

/**
 * Endpoints de autenticación: iniciar, refrescar y cerrar la sesión, y consultar el usuario.
 *
 * El token de acceso va en el cuerpo de la respuesta; el de refresco, en una cookie httpOnly.
 * @Res({ passthrough: true }) permite escribir la cookie y seguir devolviendo el cuerpo con return,
 * como cuando en ASP.NET Core se usa Response.Cookies.Append y después return Ok(...).
 */
@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject(CONFIGURACION_SESION)
    private readonly configuracion: ConfiguracionSesion,
  ) {}

  /**
   * Inicia sesión con email y contraseña. Devuelve el token de acceso y deja el de refresco en
   * una cookie httpOnly. Tiene un límite de intentos por IP para frenar ataques de fuerza bruta.
   */
  @Publico()
  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async iniciarSesion(
    @Body() dto: IniciarSesionDto,
    @Res({ passthrough: true }) respuesta: Response,
  ): Promise<RespuestaLogin> {
    const sesion = await this.authService.iniciarSesion(
      dto.email,
      dto.contrasenia,
    );
    return this.responder(sesion, respuesta);
  }

  /**
   * Devuelve un token de acceso nuevo a partir de la cookie con el token de refresco, y la
   * reemplaza por otra (rotación). Lo usa el frontend al abrir la aplicación y cuando vence el
   * token de acceso. Si la cookie no sirve, la borra y responde 401.
   */
  @Publico()
  @Post('refrescar')
  @HttpCode(HttpStatus.OK)
  async refrescarSesion(
    @Req() pedido: Request,
    @Res({ passthrough: true }) respuesta: Response,
  ): Promise<RespuestaLogin> {
    try {
      const sesion = await this.authService.refrescarSesion(
        leerCookieRefresco(pedido),
      );
      return this.responder(sesion, respuesta);
    } catch (error) {
      borrarCookieRefresco(respuesta, this.configuracion.sameSite);
      throw error;
    }
  }

  /**
   * Cierra la sesión: revoca el token de refresco y borra la cookie. Es público porque el token
   * de acceso puede haber vencido; lo que identifica la sesión es la cookie.
   */
  @Publico()
  @Post('cerrar-sesion')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cerrarSesion(
    @Req() pedido: Request,
    @Res({ passthrough: true }) respuesta: Response,
  ): Promise<void> {
    await this.authService.cerrarSesion(leerCookieRefresco(pedido));
    borrarCookieRefresco(respuesta, this.configuracion.sameSite);
  }

  /**
   * Devuelve los datos del usuario de la sesión: email, roles y jugador asociado.
   * Sin @Roles: lo puede usar cualquier usuario que haya iniciado sesión.
   */
  @ApiBearerAuth()
  @Get('yo')
  obtenerUsuarioActual(
    @UsuarioActual() usuario: ContenidoToken,
  ): Promise<UsuarioConRoles> {
    return this.authService.obtenerUsuarioActual(usuario.sub);
  }

  /** Escribe la cookie con el token de refresco y devuelve el cuerpo con el token de acceso. */
  private responder(
    sesion: SesionEmitida,
    respuesta: Response,
  ): RespuestaLogin {
    escribirCookieRefresco(
      respuesta,
      sesion.refresco.token,
      sesion.refresco.vencimiento,
      this.configuracion.sameSite,
    );
    return sesion.respuesta;
  }
}

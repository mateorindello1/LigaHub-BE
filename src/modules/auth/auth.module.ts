import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import { leerConfiguracion } from '../../config/configuracion.js';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService, CONFIGURACION_SESION } from './auth.service.js';
import { AutenticacionGuard } from './autenticacion.guard.js';
import { RolesGuard } from './roles.guard.js';
import { TokensRefrescoRepository } from './tokens-refresco.repository.js';

/** Intentos de login permitidos por IP en cada ventana de tiempo. */
const INTENTOS_LOGIN = 5;
const VENTANA_LOGIN_MS = 60_000;

/**
 * Módulo de autenticación: login con JWT, tokens de refresco en una cookie httpOnly y guards
 * globales de autenticación y de roles.
 * Equivale a AddAuthentication().AddJwtBearer() + AddAuthorization() en ASP.NET Core, con una
 * política de autorización por defecto que exige usuario autenticado.
 */
@Module({
  imports: [
    UsuariosModule,
    // registerAsync: la configuración se lee al crear el módulo, después de cargar el .env.
    JwtModule.registerAsync({
      useFactory: () => {
        const { jwt } = leerConfiguracion();
        return {
          secret: jwt.secreto,
          // La biblioteca tipa la duración como "8h" | "30m" | ...; el formato ya se validó al leerla.
          signOptions: {
            expiresIn: jwt.duracion as JwtSignOptions['expiresIn'],
          },
        };
      },
    }),
    // Límite de intentos: solo se aplica donde se usa ThrottlerGuard (el login).
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: VENTANA_LOGIN_MS, limit: INTENTOS_LOGIN }],
      errorMessage:
        'Demasiados intentos de inicio de sesión. Esperá un minuto y volvé a intentar.',
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokensRefrescoRepository,
    // Duración de la sesión y SameSite de la cookie, leídos del .env (como IOptions<T> en .NET).
    {
      provide: CONFIGURACION_SESION,
      useFactory: () => leerConfiguracion().sesion,
    },
    // Guards globales: se aplican a todos los endpoints, en este orden. Primero se exige el token
    // (salvo @Publico()) y después se controlan los roles de @Roles(...).
    { provide: APP_GUARD, useClass: AutenticacionGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule implements NestModule {
  /**
   * cookie-parser interpreta el encabezado Cookie y deja las cookies en pedido.cookies. Solo hace
   * falta en los endpoints de autenticación: es la única cookie de la API. Se registra en el
   * módulo, y no en main.ts, para que también funcione en los tests de integración.
   */
  configure(consumidor: MiddlewareConsumer): void {
    consumidor.apply(cookieParser()).forRoutes(AuthController);
  }
}

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { CLAVE_PUBLICO } from '../../common/seguridad/publico.decorator.js';
import type { ContenidoToken, PedidoAutenticado } from './contenido-token.js';

/**
 * Exige un token válido en el encabezado "Authorization: Bearer <token>" y deja el usuario de la
 * sesión en el pedido (pedido.usuario). Los endpoints marcados con @Publico() no lo exigen.
 * Equivale a [Authorize] con el esquema JwtBearer de ASP.NET Core.
 *
 * Es global (registrado como APP_GUARD en AuthModule): se aplica a todos los endpoints.
 */
@Injectable()
export class AutenticacionGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    // @Publico() puede estar en el método o en todo el controller.
    const esPublico = this.reflector.getAllAndOverride<boolean>(CLAVE_PUBLICO, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (esPublico) {
      return true;
    }

    const pedido = contexto.switchToHttp().getRequest<PedidoAutenticado>();
    const [esquema, token] = pedido.headers.authorization?.split(' ') ?? [];
    if (esquema !== 'Bearer' || !token) {
      throw new UnauthorizedException('Tenés que iniciar sesión.');
    }

    try {
      // Verifica la firma con JWT_SECRET y que no esté vencido.
      pedido.usuario = await this.jwt.verifyAsync<ContenidoToken>(token);
    } catch {
      throw new UnauthorizedException(
        'La sesión venció o no es válida. Iniciá sesión de nuevo.',
      );
    }
    return true;
  }
}

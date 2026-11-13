import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { CLAVE_PUBLICO } from '../../common/seguridad/publico.decorator.js';
import { UsuariosRepository } from '../usuarios/usuarios.repository.js';
import type { ContenidoToken, PedidoAutenticado } from './contenido-token.js';

/**
 * Exige un token válido en el encabezado "Authorization: Bearer <token>" y deja el usuario de la
 * sesión en el pedido (pedido.usuario). Los endpoints marcados con @Publico() no lo exigen.
 * Equivale a [Authorize] con el esquema JwtBearer de ASP.NET Core.
 *
 * Además de verificar el token, lee el usuario de la base en cada pedido: los roles que valen son
 * los actuales, no los que había al iniciar sesión. Si el administrador le quita un rol a alguien
 * o borra su usuario, rige desde el pedido siguiente, sin esperar a que venza el token (15 minutos).
 *
 * Es global (registrado como APP_GUARD en AuthModule): se aplica a todos los endpoints.
 */
@Injectable()
export class AutenticacionGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly usuariosRepository: UsuariosRepository,
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

    let contenido: ContenidoToken;
    try {
      // Verifica la firma con JWT_SECRET y que no esté vencido.
      contenido = await this.jwt.verifyAsync<ContenidoToken>(token);
    } catch {
      throw new UnauthorizedException(
        'La sesión venció o no es válida. Iniciá sesión de nuevo.',
      );
    }

    const usuario = await this.usuariosRepository.obtenerPorId(contenido.sub);
    if (!usuario) {
      throw new UnauthorizedException(
        'El usuario de la sesión ya no existe. Iniciá sesión de nuevo.',
      );
    }
    pedido.usuario = {
      sub: usuario.id,
      email: usuario.email,
      roles: usuario.roles,
      jugadorId: usuario.jugadorId,
    };
    return true;
  }
}

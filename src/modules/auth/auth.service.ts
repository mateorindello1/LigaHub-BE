import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ContraseniasService } from '../usuarios/contrasenias.service.js';
import type { UsuarioConRoles } from '../usuarios/usuario.js';
import { UsuariosRepository } from '../usuarios/usuarios.repository.js';
import type { ContenidoToken } from './contenido-token.js';

/** Respuesta de POST /auth/login. */
export interface RespuestaLogin {
  /** Token para enviar en cada pedido: "Authorization: Bearer <token>". */
  token: string;
  /** Fecha y hora en que vence el token (UTC, ISO 8601). */
  expira: string;
  usuario: UsuarioConRoles;
}

/**
 * Mensaje único para cualquier falla del login: no dice si el email existe o si falló la
 * contraseña, para no ayudar a averiguar qué emails están registrados.
 */
export const MENSAJE_CREDENCIALES_INVALIDAS = 'Credenciales inválidas.';

/** Casos de uso de autenticación: iniciar sesión y obtener el usuario de la sesión. */
@Injectable()
export class AuthService {
  /**
   * Hash de una contraseña cualquiera, generado una sola vez. Cuando el email no existe se
   * verifica igual contra este hash, para que la respuesta tarde lo mismo que con un email
   * registrado: si no, el tiempo de respuesta delataría qué emails existen.
   */
  private hashFicticio?: Promise<string>;

  constructor(
    private readonly usuariosRepository: UsuariosRepository,
    private readonly contrasenias: ContraseniasService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Verifica el email y la contraseña y devuelve un token firmado con el id, el email y los roles.
   * @throws UnauthorizedException con un mensaje genérico si el email o la contraseña no coinciden.
   */
  async iniciarSesion(
    email: string,
    contrasenia: string,
  ): Promise<RespuestaLogin> {
    const usuario = await this.usuariosRepository.buscarConCredenciales(email);

    this.hashFicticio ??= this.contrasenias.generarHash(
      'hash-para-igualar-tiempos',
    );
    const hash = usuario?.contraseniaHash ?? (await this.hashFicticio);
    const contraseniaCorrecta = await this.contrasenias.verificar(
      hash,
      contrasenia,
    );

    if (!usuario || !contraseniaCorrecta) {
      throw new UnauthorizedException(MENSAJE_CREDENCIALES_INVALIDAS);
    }

    const contenido: ContenidoToken = {
      sub: usuario.id,
      email: usuario.email,
      roles: usuario.roles,
    };
    const token = await this.jwt.signAsync(contenido);
    // "exp" lo agrega la biblioteca al firmar, en segundos desde 1970 (estándar de JWT).
    const { exp } = this.jwt.decode<{ exp: number }>(token);

    // El hash se quita antes de responder: nunca sale de la API.
    const { contraseniaHash: _hash, ...usuarioSinHash } = usuario;
    return {
      token,
      expira: new Date(exp * 1000).toISOString(),
      usuario: usuarioSinHash,
    };
  }

  /**
   * Devuelve el usuario de la sesión, leído de la base (sus roles pueden haber cambiado desde
   * que se emitió el token).
   * @throws UnauthorizedException si el usuario ya no existe.
   */
  async obtenerUsuarioActual(id: number): Promise<UsuarioConRoles> {
    const usuario = await this.usuariosRepository.obtenerPorId(id);
    if (!usuario) {
      throw new UnauthorizedException(
        'El usuario de la sesión ya no existe. Iniciá sesión de nuevo.',
      );
    }
    return usuario;
  }
}

import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { ConfiguracionSesion } from '../../config/configuracion.js';
import { ContraseniasService } from '../usuarios/contrasenias.service.js';
import type { UsuarioConRoles } from '../usuarios/usuario.js';
import { UsuariosRepository } from '../usuarios/usuarios.repository.js';
import type { ContenidoToken } from './contenido-token.js';
import { TokensRefrescoRepository } from './tokens-refresco.repository.js';

/** Respuesta de POST /auth/login y POST /auth/refrescar. */
export interface RespuestaLogin {
  /** Token de acceso para enviar en cada pedido: "Authorization: Bearer <token>". */
  token: string;
  /** Fecha y hora en que vence el token de acceso (UTC, ISO 8601). */
  expira: string;
  usuario: UsuarioConRoles;
}

/** Token de refresco recién emitido: el controller lo escribe en la cookie. */
export interface TokenRefrescoEmitido {
  token: string;
  /** Fin de la sesión: la cookie vence en el mismo momento. */
  vencimiento: Date;
}

/** Resultado de iniciar o refrescar la sesión: lo que va en el cuerpo y lo que va en la cookie. */
export interface SesionEmitida {
  respuesta: RespuestaLogin;
  refresco: TokenRefrescoEmitido;
}

/** Clave de inyección de la configuración de la sesión (ver AuthModule). */
export const CONFIGURACION_SESION = Symbol('CONFIGURACION_SESION');

/**
 * Mensaje único para cualquier falla del login: no dice si el email existe o si falló la
 * contraseña, para no ayudar a averiguar qué emails están registrados.
 */
export const MENSAJE_CREDENCIALES_INVALIDAS = 'Credenciales inválidas.';

/** Mensaje para un token de refresco que falta, venció, se revocó o no existe. */
export const MENSAJE_SESION_INVALIDA =
  'La sesión venció o no es válida. Iniciá sesión de nuevo.';

/** SHA-256 en hexadecimal: es lo que se guarda del token de refresco. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Casos de uso de autenticación: iniciar sesión, refrescarla, cerrarla y obtener el usuario.
 *
 * La sesión usa dos tokens:
 * - **De acceso:** un JWT de vida corta (15 minutos) que el frontend guarda en memoria y envía en
 *   cada pedido. Si lo roban, sirve por poco tiempo.
 * - **De refresco:** un valor aleatorio de vida larga (7 días) que viaja en una cookie httpOnly,
 *   inaccesible para el JavaScript de la página. Solo sirve para pedir un token de acceso nuevo.
 *
 * Cada refresco entrega un token de refresco nuevo e invalida el anterior (rotación). Si alguien
 * presenta uno ya usado, es señal de que lo copiaron: se revoca toda la sesión.
 */
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
    private readonly tokensRefresco: TokensRefrescoRepository,
    private readonly contrasenias: ContraseniasService,
    private readonly jwt: JwtService,
    @Inject(CONFIGURACION_SESION)
    private readonly configuracion: ConfiguracionSesion,
  ) {}

  /**
   * Verifica el email y la contraseña e inicia una sesión: un token de acceso firmado con el id,
   * el email y los roles, y un token de refresco.
   * @throws UnauthorizedException con un mensaje genérico si el email o la contraseña no coinciden.
   */
  async iniciarSesion(
    email: string,
    contrasenia: string,
  ): Promise<SesionEmitida> {
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

    // Limpieza: los tokens vencidos de este usuario ya no sirven ni para detectar robos.
    await this.tokensRefresco.borrarVencidos(usuario.id);

    // Sesión nueva: familia nueva, que vence dentro de la duración configurada.
    const refresco = this.generarTokenRefresco(
      new Date(Date.now() + this.configuracion.duracionRefresco),
    );
    await this.tokensRefresco.crear({
      usuarioId: usuario.id,
      familiaId: randomUUID(),
      tokenHash: hashToken(refresco.token),
      fechaHoraVencimiento: refresco.vencimiento,
    });

    // El hash se quita antes de responder: nunca sale de la API.
    const { contraseniaHash: _hash, ...usuarioSinHash } = usuario;
    return {
      respuesta: await this.emitirTokenAcceso(usuarioSinHash),
      refresco,
    };
  }

  /**
   * Entrega un token de acceso nuevo a partir del token de refresco de la cookie, y reemplaza el
   * token de refresco por otro de la misma sesión (rotación).
   * @throws UnauthorizedException si falta, no existe, venció o ya se usó. Si ya se usó, además
   * revoca toda la sesión: alguien tiene una copia.
   */
  async refrescarSesion(token: string | undefined): Promise<SesionEmitida> {
    if (!token) {
      throw new UnauthorizedException(MENSAJE_SESION_INVALIDA);
    }
    const guardado = await this.tokensRefresco.buscarPorHash(hashToken(token));
    if (!guardado || guardado.fechaHoraVencimiento.getTime() <= Date.now()) {
      throw new UnauthorizedException(MENSAJE_SESION_INVALIDA);
    }
    if (guardado.fechaHoraRevocacion) {
      // Reutilización de un token ya usado: se corta la sesión para todos los que la tengan.
      await this.tokensRefresco.revocarFamilia(guardado.familiaId);
      throw new UnauthorizedException(MENSAJE_SESION_INVALIDA);
    }

    // El usuario se lee de nuevo: pudo cambiar de roles o haberse borrado.
    const usuario = await this.usuariosRepository.obtenerPorId(
      guardado.usuarioId,
    );
    if (!usuario) {
      throw new UnauthorizedException(MENSAJE_SESION_INVALIDA);
    }

    // El nuevo hereda el vencimiento: refrescar no alarga la sesión.
    const refresco = this.generarTokenRefresco(guardado.fechaHoraVencimiento);
    const rotado = await this.tokensRefresco.rotar(guardado.id, {
      usuarioId: usuario.id,
      familiaId: guardado.familiaId,
      tokenHash: hashToken(refresco.token),
      fechaHoraVencimiento: refresco.vencimiento,
    });
    if (!rotado) {
      // Otro pedido lo usó entre la lectura y la rotación: mismo caso que la reutilización.
      await this.tokensRefresco.revocarFamilia(guardado.familiaId);
      throw new UnauthorizedException(MENSAJE_SESION_INVALIDA);
    }

    return { respuesta: await this.emitirTokenAcceso(usuario), refresco };
  }

  /**
   * Cierra la sesión del token de refresco: lo revoca junto con toda su familia. Si el token no
   * existe o ya no sirve, no hace nada (cerrar una sesión cerrada no es un error).
   */
  async cerrarSesion(token: string | undefined): Promise<void> {
    if (!token) return;
    const guardado = await this.tokensRefresco.buscarPorHash(hashToken(token));
    if (guardado) {
      await this.tokensRefresco.revocarFamilia(guardado.familiaId);
    }
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

  // #region Métodos privados
  /** Firma un token de acceso con el id, el email y los roles del usuario. */
  private async emitirTokenAcceso(
    usuario: UsuarioConRoles,
  ): Promise<RespuestaLogin> {
    const contenido: ContenidoToken = {
      sub: usuario.id,
      email: usuario.email,
      roles: usuario.roles,
    };
    const token = await this.jwt.signAsync(contenido);
    // "exp" lo agrega la biblioteca al firmar, en segundos desde 1970 (estándar de JWT).
    const { exp } = this.jwt.decode<{ exp: number }>(token);
    return { token, expira: new Date(exp * 1000).toISOString(), usuario };
  }

  /**
   * Genera un token de refresco: 32 bytes aleatorios (256 bits), imposibles de adivinar. No es un
   * JWT porque no necesita llevar datos: la base dice a quién pertenece y si sigue vigente.
   */
  private generarTokenRefresco(vencimiento: Date): TokenRefrescoEmitido {
    return { token: randomBytes(32).toString('base64url'), vencimiento };
  }
  // #endregion
}

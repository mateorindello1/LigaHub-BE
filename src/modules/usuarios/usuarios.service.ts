import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Rol } from '../../common/seguridad/rol.enum.js';
import { ContraseniasService } from './contrasenias.service.js';
import { CambiarContraseniaDto } from './dto/cambiar-contrasenia.dto.js';
import { CrearUsuarioDto } from './dto/crear-usuario.dto.js';
import { FotosPerfilService } from './fotos-perfil.service.js';
import { ModificarUsuarioDto } from './dto/modificar-usuario.dto.js';
import type { DatosUsuario, UsuarioConRoles } from './usuario.js';
import { UsuariosRepository } from './usuarios.repository.js';

/**
 * Gestión de usuarios por el Administrador: alta, modificación (email, roles y jugador),
 * cambio de contraseña y baja.
 *
 * Reglas:
 * - El email no se puede repetir.
 * - El rol Jugador exige un jugador asociado, y sin ese rol no puede haber jugador asociado.
 * - Un jugador tiene como máximo un usuario.
 * - Un administrador no puede quitarse el rol de Administrador ni borrarse a sí mismo: así el
 *   sistema nunca queda sin quien lo administre.
 */
@Injectable()
export class UsuariosService {
  constructor(
    private readonly usuariosRepository: UsuariosRepository,
    private readonly contrasenias: ContraseniasService,
    private readonly fotosPerfil: FotosPerfilService,
  ) {}

  /** Devuelve todos los usuarios con sus roles. */
  obtenerTodos(): Promise<UsuarioConRoles[]> {
    return this.usuariosRepository.obtenerTodos();
  }

  /** Devuelve un usuario. Si no existe, responde 404. */
  async obtenerPorId(id: number): Promise<UsuarioConRoles> {
    const usuario = await this.usuariosRepository.obtenerPorId(id);
    if (!usuario) {
      throw new NotFoundException(`No existe el usuario ${id}.`);
    }
    return usuario;
  }

  /** Crea un usuario con su contraseña (guardada con Argon2id) y sus roles. */
  async crear(dto: CrearUsuarioDto): Promise<UsuarioConRoles> {
    const datos: DatosUsuario = {
      email: dto.email,
      roles: dto.roles,
      jugadorId: dto.jugadorId ?? null,
    };
    await this.validar(datos);
    const hash = await this.contrasenias.generarHash(dto.contrasenia);
    return this.usuariosRepository.crear(datos, hash);
  }

  /**
   * Modifica el email, los roles o el jugador. Lo que no viene en el pedido queda como estaba,
   * salvo el jugador: si se quita el rol Jugador sin decir nada del jugador, se desasocia.
   * @param idSesion id del usuario que hace el pedido (para no quitarse el rol de Administrador).
   */
  async modificar(
    id: number,
    dto: ModificarUsuarioDto,
    idSesion: number,
  ): Promise<UsuarioConRoles> {
    const actual = await this.obtenerPorId(id);
    const roles = dto.roles ?? actual.roles;
    const datos: DatosUsuario = {
      email: dto.email ?? actual.email,
      roles,
      jugadorId:
        dto.jugadorId !== undefined
          ? dto.jugadorId
          : roles.includes(Rol.Jugador)
            ? actual.jugadorId
            : null,
    };

    if (
      id === idSesion &&
      actual.roles.includes(Rol.Administrador) &&
      !roles.includes(Rol.Administrador)
    ) {
      throw new ConflictException(
        'No podés quitarte el rol de Administrador: el sistema podría quedar sin administradores.',
      );
    }

    await this.validar(datos, id);
    return this.usuariosRepository.modificar(id, datos);
  }

  /** Reemplaza la contraseña de un usuario. */
  async cambiarContrasenia(
    id: number,
    dto: CambiarContraseniaDto,
  ): Promise<void> {
    await this.obtenerPorId(id);
    const hash = await this.contrasenias.generarHash(dto.contrasenia);
    await this.usuariosRepository.cambiarContrasenia(id, hash);
  }

  /**
   * Borra un usuario y su foto de perfil.
   * @param idSesion id del usuario que hace el pedido (no puede borrarse a sí mismo).
   */
  async borrar(id: number, idSesion: number): Promise<void> {
    if (id === idSesion) {
      throw new ConflictException('No podés borrar tu propio usuario.');
    }
    const usuario = await this.obtenerPorId(id);
    await this.usuariosRepository.borrar(id);
    await this.fotosPerfil.borrarArchivo(usuario.fotoPerfil);
  }

  /** Reglas comunes al alta y la modificación. */
  private async validar(
    datos: DatosUsuario,
    excluirId?: number,
  ): Promise<void> {
    if (await this.usuariosRepository.existeConEmail(datos.email, excluirId)) {
      throw new ConflictException(
        `Ya existe un usuario con el email "${datos.email.trim().toLowerCase()}".`,
      );
    }

    const esJugador = datos.roles.includes(Rol.Jugador);
    if (esJugador && datos.jugadorId === null) {
      throw this.errorDeCampo(
        'jugadorId',
        'Un usuario con rol Jugador necesita un jugador asociado.',
      );
    }
    if (!esJugador && datos.jugadorId !== null) {
      throw this.errorDeCampo(
        'jugadorId',
        'Solo un usuario con rol Jugador puede tener un jugador asociado.',
      );
    }

    if (datos.jugadorId !== null) {
      if (!(await this.usuariosRepository.existeJugador(datos.jugadorId))) {
        throw new NotFoundException(`No existe el jugador ${datos.jugadorId}.`);
      }
      if (
        await this.usuariosRepository.jugadorTieneUsuario(
          datos.jugadorId,
          excluirId,
        )
      ) {
        throw new ConflictException(
          'Ese jugador ya tiene un usuario asociado.',
        );
      }
    }
  }

  /** Error 400 con el mismo formato que el de la validación de los DTO (detalle por campo). */
  private errorDeCampo(campo: string, mensaje: string): BadRequestException {
    return new BadRequestException({
      mensaje: 'Los datos enviados no son válidos.',
      detalles: [{ campo, mensajes: [mensaje] }],
    });
  }
}

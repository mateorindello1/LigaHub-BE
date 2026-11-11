import { Injectable } from '@nestjs/common';
import type { Rol } from '../../common/seguridad/rol.enum.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  normalizarEmail,
  type DatosUsuario,
  type UsuarioConCredenciales,
  type UsuarioConRoles,
} from './usuario.js';

/** Campos de Usuario que se pueden devolver: todos menos el hash de la contraseña. */
const CAMPOS_PUBLICOS = {
  id: true,
  email: true,
  fotoPerfil: true,
  jugadorId: true,
  jugador: { select: { id: true, nombres: true, apellidos: true } },
  roles: { select: { rol: true }, orderBy: { rol: 'asc' } },
} as const;

/** Convierte las filas de UsuarioRol en la lista de roles. */
function conRoles<T extends { roles: { rol: number }[] }>(
  usuario: T,
): Omit<T, 'roles'> & { roles: Rol[] } {
  return { ...usuario, roles: usuario.roles.map((fila) => fila.rol as Rol) };
}

/**
 * Acceso a datos de usuarios.
 * El hash de la contraseña solo sale de acá en buscarConCredenciales, que usa el login.
 */
@Injectable()
export class UsuariosRepository {
  constructor(private readonly prisma: PrismaService) {}

  // #region Consultas
  /** Busca un usuario por email con su hash y sus roles, para verificar el login. */
  async buscarConCredenciales(
    email: string,
  ): Promise<UsuarioConCredenciales | null> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: normalizarEmail(email) },
      select: { ...CAMPOS_PUBLICOS, contraseniaHash: true },
    });
    return usuario && conRoles(usuario);
  }

  /** Devuelve el usuario con sus roles, sin el hash, o null si no existe. */
  async obtenerPorId(id: number): Promise<UsuarioConRoles | null> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: CAMPOS_PUBLICOS,
    });
    return usuario && conRoles(usuario);
  }

  /** Devuelve todos los usuarios, ordenados por email. */
  async obtenerTodos(): Promise<UsuarioConRoles[]> {
    const usuarios = await this.prisma.usuario.findMany({
      select: CAMPOS_PUBLICOS,
      orderBy: { email: 'asc' },
    });
    return usuarios.map(conRoles);
  }

  /**
   * Indica si ya existe otro usuario con ese email.
   * @param excluirId id del usuario que se está modificando, para no compararlo consigo mismo.
   */
  async existeConEmail(email: string, excluirId?: number): Promise<boolean> {
    const cantidad = await this.prisma.usuario.count({
      where: {
        email: normalizarEmail(email),
        ...(excluirId !== undefined && { id: { not: excluirId } }),
      },
    });
    return cantidad > 0;
  }

  /** Indica si el jugador ya está asociado a otro usuario. */
  async jugadorTieneUsuario(
    jugadorId: number,
    excluirId?: number,
  ): Promise<boolean> {
    const cantidad = await this.prisma.usuario.count({
      where: {
        jugadorId,
        ...(excluirId !== undefined && { id: { not: excluirId } }),
      },
    });
    return cantidad > 0;
  }

  /** Indica si existe el jugador. */
  async existeJugador(jugadorId: number): Promise<boolean> {
    return (await this.prisma.jugador.count({ where: { id: jugadorId } })) > 0;
  }
  // #endregion

  // #region Escrituras
  /** Inserta un usuario con sus roles y devuelve el registro creado. */
  async crear(
    datos: DatosUsuario,
    contraseniaHash: string,
  ): Promise<UsuarioConRoles> {
    const usuario = await this.prisma.usuario.create({
      data: {
        email: normalizarEmail(datos.email),
        contraseniaHash,
        jugadorId: datos.jugadorId,
        roles: { create: datos.roles.map((rol) => ({ rol })) },
      },
      select: CAMPOS_PUBLICOS,
    });
    return conRoles(usuario);
  }

  /**
   * Modifica el email, el jugador y los roles. Los roles se reemplazan: se borran los
   * anteriores y se crean los nuevos, todo en una transacción.
   */
  async modificar(id: number, datos: DatosUsuario): Promise<UsuarioConRoles> {
    const usuario = await this.prisma.$transaction(async (tx) => {
      await tx.usuarioRol.deleteMany({ where: { usuarioId: id } });
      return tx.usuario.update({
        where: { id },
        data: {
          email: normalizarEmail(datos.email),
          jugadorId: datos.jugadorId,
          roles: { create: datos.roles.map((rol) => ({ rol })) },
        },
        select: CAMPOS_PUBLICOS,
      });
    });
    return conRoles(usuario);
  }

  /**
   * Reemplaza el hash de la contraseña y revoca las sesiones abiertas del usuario: con la
   * contraseña vieja ya no se puede seguir refrescando la sesión.
   */
  async cambiarContrasenia(id: number, contraseniaHash: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id },
        data: { contraseniaHash },
      }),
      this.prisma.tokenRefresco.updateMany({
        where: { usuarioId: id, fechaHoraRevocacion: null },
        data: { fechaHoraRevocacion: new Date() },
      }),
    ]);
  }

  /** Cambia la foto del usuario (nombre del archivo, o null para quitarla). */
  async cambiarFotoPerfil(
    id: number,
    fotoPerfil: string | null,
  ): Promise<UsuarioConRoles> {
    const usuario = await this.prisma.usuario.update({
      where: { id },
      data: { fotoPerfil },
      select: CAMPOS_PUBLICOS,
    });
    return conRoles(usuario);
  }

  /** Borra el usuario, sus roles y sus tokens de refresco (las claves foráneas no borran en cascada). */
  async borrar(id: number): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.usuarioRol.deleteMany({ where: { usuarioId: id } }),
      this.prisma.tokenRefresco.deleteMany({ where: { usuarioId: id } }),
      this.prisma.usuario.delete({ where: { id } }),
    ]);
  }
  // #endregion
}

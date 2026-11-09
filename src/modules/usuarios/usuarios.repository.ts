import { Injectable } from '@nestjs/common';
import type { Rol } from '../../common/seguridad/rol.enum.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  normalizarEmail,
  type UsuarioConCredenciales,
  type UsuarioConRoles,
} from './usuario.js';

/** Campos de Usuario que se pueden devolver: todos menos el hash de la contraseña. */
const CAMPOS_PUBLICOS = {
  id: true,
  email: true,
  fotoPerfilURL: true,
  jugadorId: true,
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
}

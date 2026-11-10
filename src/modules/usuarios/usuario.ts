import type { Rol } from '../../common/seguridad/rol.enum.js';

/** Jugador asociado a un usuario, con lo necesario para mostrarlo. */
export interface JugadorDeUsuario {
  id: number;
  nombres: string;
  apellidos: string;
}

/** Usuario con sus roles, sin datos sensibles. Es lo que se puede devolver en una respuesta. */
export interface UsuarioConRoles {
  id: number;
  email: string;
  fotoPerfilURL: string | null;
  /** Jugador asociado (solo para usuarios con rol Jugador). */
  jugadorId: number | null;
  jugador: JugadorDeUsuario | null;
  roles: Rol[];
}

/**
 * Usuario con el hash de su contraseña. Solo para verificar el login: nunca se devuelve
 * en una respuesta de la API.
 */
export interface UsuarioConCredenciales extends UsuarioConRoles {
  contraseniaHash: string;
}

/** Datos para guardar un usuario (alta o modificación), ya validados por el servicio. */
export interface DatosUsuario {
  email: string;
  jugadorId: number | null;
  roles: Rol[];
}

/**
 * Normaliza un email para guardarlo y buscarlo siempre igual: sin espacios y en minúsculas.
 * La base además compara sin distinguir mayúsculas (intercalación CI), pero así el email
 * guardado queda uniforme.
 */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

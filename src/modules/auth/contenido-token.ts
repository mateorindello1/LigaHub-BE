import type { Request } from 'express';
import type { Rol } from '../../common/seguridad/rol.enum.js';

/**
 * Datos que viajan dentro del token (los "claims" del JWT).
 * Van firmados pero no cifrados: cualquiera puede leerlos, así que nunca se ponen datos sensibles.
 */
export interface ContenidoToken {
  /** Id del usuario ("subject", nombre estándar de JWT). */
  sub: number;
  email: string;
  roles: Rol[];
}

/**
 * Usuario de la sesión tal como lo deja el guard de autenticación en el pedido: el contenido del
 * token con los roles y el jugador asociado leídos de la base en ese momento.
 */
export interface UsuarioDeSesion extends ContenidoToken {
  /** Jugador asociado (solo para usuarios con rol Jugador). Sirve para los permisos por pertenencia. */
  jugadorId: number | null;
}

/** Pedido HTTP con el usuario de la sesión, que agrega el guard de autenticación. */
export type PedidoAutenticado = Request & { usuario?: UsuarioDeSesion };

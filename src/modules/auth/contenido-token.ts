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

/** Pedido HTTP con el usuario de la sesión, que agrega el guard de autenticación. */
export type PedidoAutenticado = Request & { usuario?: ContenidoToken };

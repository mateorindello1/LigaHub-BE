/**
 * Roles de usuario. Se guardan como tinyint en la columna UsuarioRol.rol.
 * Los valores deben coincidir con los documentados en prisma/schema.prisma.
 * Permisos de cada rol: ver docs/seguridad.md.
 */
export enum Rol {
  /** Organizador del torneo: gestiona todo. */
  Administrador = 1,
  /** Carga los resultados y eventos de los partidos. */
  Asistente = 2,
  /** Consulta y actualiza su propia información. */
  Jugador = 3,
}

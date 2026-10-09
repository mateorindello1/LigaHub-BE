/**
 * Estado de un partido. Se guarda como tinyint en la columna Partido.estadoPartido.
 * Los valores deben coincidir con los documentados en prisma/schema.prisma.
 */
export enum EstadoPartido {
  /** Generado en el fixture, todavía no se jugó. */
  Programado = 1,
  /** Jugado, con resultado cargado. */
  Finalizado = 2,
  /** Ganado por no presentación del rival (walkover). El resultado se carga igual. */
  WO = 3,
  /** No se jugó en la fecha prevista. */
  Suspendido = 4,
}

/** Estados en los que el partido cuenta para la tabla de posiciones. */
export const ESTADOS_CON_RESULTADO = [
  EstadoPartido.Finalizado,
  EstadoPartido.WO,
] as const;

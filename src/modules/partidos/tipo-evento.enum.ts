/**
 * Tipo de evento de un partido. Se guarda como tinyint en la columna Evento.tipoEvento.
 * Los valores deben coincidir con los documentados en prisma/schema.prisma.
 */
export enum TipoEvento {
  /** Suma un gol al equipo del jugador. */
  Gol = 1,
  /** Suma un gol al equipo rival. */
  GolEnContra = 2,
  /** Tarjeta amarilla. */
  Amonestacion = 3,
  /** Tarjeta roja. */
  Expulsion = 4,
  /** Sale el jugador del evento y entra el de partidoJugadorCambioId (del mismo equipo). */
  Cambio = 5,
}

/** Valores válidos (1 a 5), para validar con @IsIn. */
export const VALORES_TIPO_EVENTO = Object.values(TipoEvento).filter(
  (valor) => typeof valor === 'number',
);

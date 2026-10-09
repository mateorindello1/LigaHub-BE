/**
 * Estado de un torneo. Se guarda como tinyint en la columna Torneo.estadoTorneo.
 * Los valores deben coincidir con los documentados en prisma/schema.prisma.
 */
export enum EstadoTorneo {
  /** Abierto a inscripciones de equipos. Estado inicial de todo torneo. */
  Inscripcion = 1,
  /** Fixture generado y partidos en juego. */
  EnCurso = 2,
  /** Todos los partidos jugados. */
  Finalizado = 3,
}

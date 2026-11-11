/** Participación de un jugador en un partido jugado, con los goles que hizo en él. */
export interface Participacion {
  inscripcionJugadorId: string;
  jugador: { id: number; nombres: string; apellidos: string };
  equipo: { id: number; nombre: string; escudoURL: string | null };
  /** Goles propios: los goles en contra no cuentan. */
  goles: number;
}

/** Una fila de la tabla de goleadores. */
export interface FilaGoleadores {
  /** Los empatados en goles comparten la posición (1, 2, 2, 4). */
  posicion: number;
  jugador: Participacion['jugador'];
  equipo: Participacion['equipo'];
  goles: number;
  partidosJugados: number;
}

/**
 * Tabla de goleadores a partir de las participaciones en los partidos jugados. Función pura, como
 * calcularPosiciones.
 * - Solo aparecen los jugadores con al menos un gol.
 * - Orden: más goles; a igual cantidad, menos partidos jugados (mejor promedio) y después apellido
 *   y nombre. La posición solo depende de los goles.
 */
export function calcularGoleadores(
  participaciones: Participacion[],
): FilaGoleadores[] {
  const porJugador = new Map<string, Omit<FilaGoleadores, 'posicion'>>();
  for (const {
    inscripcionJugadorId,
    jugador,
    equipo,
    goles,
  } of participaciones) {
    const fila = porJugador.get(inscripcionJugadorId) ?? {
      jugador,
      equipo,
      goles: 0,
      partidosJugados: 0,
    };
    fila.goles += goles;
    fila.partidosJugados++;
    porJugador.set(inscripcionJugadorId, fila);
  }

  const ordenadas = [...porJugador.values()]
    .filter((fila) => fila.goles > 0)
    .sort(
      (a, b) =>
        b.goles - a.goles ||
        a.partidosJugados - b.partidosJugados ||
        a.jugador.apellidos.localeCompare(b.jugador.apellidos, 'es') ||
        a.jugador.nombres.localeCompare(b.jugador.nombres, 'es'),
    );

  // Posición "de competencia": el primero con una cantidad de goles fija la posición de todos los
  // que tienen esa misma cantidad.
  let posicion = 0;
  return ordenadas.map((fila, indice) => {
    if (indice === 0 || fila.goles !== ordenadas[indice - 1].goles) {
      posicion = indice + 1;
    }
    return { posicion, ...fila };
  });
}

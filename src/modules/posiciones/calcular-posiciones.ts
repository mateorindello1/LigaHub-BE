/**
 * Cálculo de la tabla de posiciones. Es una función pura: recibe los datos y devuelve la tabla,
 * sin acceder a la base. Así se puede probar con tests unitarios sin levantar nada.
 */

export const PUNTOS_POR_VICTORIA = 3;
export const PUNTOS_POR_EMPATE = 1;

/** Equipo tal como aparece en la tabla. */
export interface EquipoTabla {
  id: number;
  nombre: string;
  escudoURL: string | null;
}

/** Partido con resultado, con lo mínimo necesario para el cálculo. */
export interface PartidoConResultado {
  equipoLocalId: number;
  equipoVisitanteId: number;
  golesLocal: number;
  golesVisitante: number;
}

/** Una línea de la tabla de posiciones. */
export interface FilaPosiciones {
  posicion: number;
  equipo: EquipoTabla;
  partidosJugados: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  golesAFavor: number;
  golesEnContra: number;
  diferenciaGoles: number;
  puntos: number;
}

/**
 * Calcula la tabla de posiciones de un torneo.
 *
 * - Victoria: 3 puntos. Empate: 1 punto. Derrota: 0.
 * - Orden: puntos, diferencia de gol, goles a favor y, por último, nombre (para que el orden sea estable).
 * - Aparecen todos los equipos inscriptos, aunque todavía no hayan jugado.
 * - Los partidos de equipos que no están en la lista se ignoran.
 */
export function calcularPosiciones(
  equipos: EquipoTabla[],
  partidos: PartidoConResultado[],
): FilaPosiciones[] {
  // Una línea en cero por cada equipo, indexada por id para acumular rápido.
  const filas = new Map<number, FilaPosiciones>(
    equipos.map((equipo) => [
      equipo.id,
      {
        posicion: 0,
        equipo,
        partidosJugados: 0,
        ganados: 0,
        empatados: 0,
        perdidos: 0,
        golesAFavor: 0,
        golesEnContra: 0,
        diferenciaGoles: 0,
        puntos: 0,
      },
    ]),
  );

  // Acumula cada partido en las dos líneas involucradas.
  for (const partido of partidos) {
    const local = filas.get(partido.equipoLocalId);
    const visitante = filas.get(partido.equipoVisitanteId);
    if (!local || !visitante) {
      continue;
    }
    sumarResultado(local, partido.golesLocal, partido.golesVisitante);
    sumarResultado(visitante, partido.golesVisitante, partido.golesLocal);
  }

  // Ordena con los criterios de desempate y numera las posiciones.
  return [...filas.values()]
    .sort(
      (a, b) =>
        b.puntos - a.puntos ||
        b.diferenciaGoles - a.diferenciaGoles ||
        b.golesAFavor - a.golesAFavor ||
        a.equipo.nombre.localeCompare(b.equipo.nombre, 'es'),
    )
    .map((fila, indice) => ({ ...fila, posicion: indice + 1 }));
}

/** Suma un partido a la línea de un equipo, desde el punto de vista de ese equipo. */
function sumarResultado(
  fila: FilaPosiciones,
  golesPropios: number,
  golesRival: number,
): void {
  fila.partidosJugados++;
  fila.golesAFavor += golesPropios;
  fila.golesEnContra += golesRival;
  fila.diferenciaGoles = fila.golesAFavor - fila.golesEnContra;

  if (golesPropios > golesRival) {
    fila.ganados++;
    fila.puntos += PUNTOS_POR_VICTORIA;
  } else if (golesPropios === golesRival) {
    fila.empatados++;
    fila.puntos += PUNTOS_POR_EMPATE;
  } else {
    fila.perdidos++;
  }
}

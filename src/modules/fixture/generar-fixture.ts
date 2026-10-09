/**
 * Algoritmo del fixture "todos contra todos" (round robin). Es una función pura:
 * recibe los ids de los equipos y devuelve las fechas, sin acceder a la base.
 */

/** Un partido del fixture: quién es local y quién visitante. */
export interface PartidoGenerado {
  localId: number;
  visitanteId: number;
}

/** Una fecha del fixture. */
export interface FechaGenerada {
  numeroFecha: number;
  partidos: PartidoGenerado[];
  /** Equipo que no juega en esta fecha (solo con cantidad impar de equipos). */
  equipoLibreId: number | null;
}

/**
 * Genera el fixture con el método del círculo:
 * - Si la cantidad de equipos es impar, se agrega un "libre": quien le toca, no juega esa fecha.
 * - El primer equipo queda fijo y el resto rota una posición por fecha.
 * - Con n equipos (n par, contando el libre) salen n - 1 fechas de n / 2 partidos;
 *   cada equipo enfrenta a todos los demás exactamente una vez.
 * - La localía se alterna para que cada equipo sea local en la mitad de sus partidos (±1).
 * - Con ida y vuelta, se repiten las fechas invirtiendo la localía.
 *
 * @throws Error si hay menos de dos equipos o ids repetidos.
 */
export function generarFixture(
  equipoIds: number[],
  idaYVuelta = false,
): FechaGenerada[] {
  if (equipoIds.length < 2) {
    throw new Error(
      'Se necesitan al menos dos equipos para generar el fixture.',
    );
  }
  if (new Set(equipoIds).size !== equipoIds.length) {
    throw new Error('Hay equipos repetidos.');
  }

  // null representa el "libre" cuando la cantidad es impar.
  const participantes: (number | null)[] =
    equipoIds.length % 2 === 0 ? [...equipoIds] : [...equipoIds, null];
  const n = participantes.length;

  const ida: FechaGenerada[] = [];
  let rotacion = participantes;

  for (let ronda = 0; ronda < n - 1; ronda++) {
    const partidos: PartidoGenerado[] = [];
    let equipoLibreId: number | null = null;

    // Empareja el primero con el último, el segundo con el anteúltimo, etc.
    for (let i = 0; i < n / 2; i++) {
      const a = rotacion[i];
      const b = rotacion[n - 1 - i];

      if (a === null || b === null) {
        equipoLibreId = a ?? b;
        continue;
      }

      // El equipo fijo alterna localía por fecha; el resto, según su posición en la rueda.
      const invertir = i === 0 ? ronda % 2 === 1 : i % 2 === 1;
      partidos.push(
        invertir
          ? { localId: b, visitanteId: a }
          : { localId: a, visitanteId: b },
      );
    }

    ida.push({ numeroFecha: ronda + 1, partidos, equipoLibreId });

    // Rota todos menos el primero: el último pasa a la segunda posición.
    rotacion = [rotacion[0], rotacion[n - 1], ...rotacion.slice(1, n - 1)];
  }

  if (!idaYVuelta) {
    return ida;
  }

  // Vuelta: mismas fechas en el mismo orden, con la localía invertida.
  const vuelta = ida.map((fecha) => ({
    numeroFecha: fecha.numeroFecha + ida.length,
    partidos: fecha.partidos.map((partido) => ({
      localId: partido.visitanteId,
      visitanteId: partido.localId,
    })),
    equipoLibreId: fecha.equipoLibreId,
  }));

  return [...ida, ...vuelta];
}

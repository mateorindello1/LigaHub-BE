import { describe, expect, it } from 'vitest';
import {
  calcularGoleadores,
  type Participacion,
} from './calcular-goleadores.js';

const ALFA = { id: 1, nombre: 'Alfa', escudoURL: null };
const BETA = { id: 2, nombre: 'Beta', escudoURL: null };

/** Participación de un jugador en un partido con la cantidad de goles indicada. */
function jugo(
  id: number,
  apellidos: string,
  goles: number,
  equipo = ALFA,
): Participacion {
  return {
    inscripcionJugadorId: `ins-${id}`,
    jugador: { id, nombres: 'Nombre', apellidos },
    equipo,
    goles,
  };
}

describe('calcularGoleadores', () => {
  it('suma los goles y los partidos jugados de cada jugador', () => {
    // Arrange: Pérez juega dos partidos (2 y 1 goles); Díaz, uno (1 gol).
    const participaciones = [
      jugo(1, 'Pérez', 2),
      jugo(1, 'Pérez', 1),
      jugo(2, 'Díaz', 1, BETA),
    ];

    // Act
    const tabla = calcularGoleadores(participaciones);

    // Assert
    expect(tabla).toEqual([
      {
        posicion: 1,
        jugador: { id: 1, nombres: 'Nombre', apellidos: 'Pérez' },
        equipo: ALFA,
        goles: 3,
        partidosJugados: 2,
      },
      {
        posicion: 2,
        jugador: { id: 2, nombres: 'Nombre', apellidos: 'Díaz' },
        equipo: BETA,
        goles: 1,
        partidosJugados: 1,
      },
    ]);
  });

  it('deja afuera a quien jugó sin hacer goles', () => {
    // Act
    const tabla = calcularGoleadores([
      jugo(1, 'Pérez', 0),
      jugo(1, 'Pérez', 0),
    ]);

    // Assert
    expect(tabla).toEqual([]);
  });

  it('a igual cantidad de goles comparten la posición; ordena por menos partidos y después por apellido', () => {
    // Arrange: Gómez, Álvarez y Díaz con 2 goles; Gómez en un partido, los otros en dos.
    // Torres, con 1 gol.
    const participaciones = [
      jugo(1, 'Díaz', 1),
      jugo(1, 'Díaz', 1),
      jugo(2, 'Álvarez', 2),
      jugo(2, 'Álvarez', 0),
      jugo(3, 'Gómez', 2),
      jugo(4, 'Torres', 1),
    ];

    // Act
    const tabla = calcularGoleadores(participaciones);

    // Assert
    expect(
      tabla.map((fila) => [fila.posicion, fila.jugador.apellidos]),
    ).toEqual([
      [1, 'Gómez'],
      [1, 'Álvarez'],
      [1, 'Díaz'],
      [4, 'Torres'],
    ]);
  });
});

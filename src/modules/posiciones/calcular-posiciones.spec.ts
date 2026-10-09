import {
  calcularPosiciones,
  type EquipoTabla,
  type PartidoConResultado,
} from './calcular-posiciones.js';

/** Equipos de prueba. */
const A: EquipoTabla = { id: 1, nombre: 'Alfa', escudoURL: null };
const B: EquipoTabla = { id: 2, nombre: 'Beta', escudoURL: null };
const C: EquipoTabla = { id: 3, nombre: 'Gamma', escudoURL: null };
const D: EquipoTabla = { id: 4, nombre: 'Delta', escudoURL: null };

/** Atajo para armar un partido: local, visitante y resultado. */
function partido(
  local: EquipoTabla,
  visitante: EquipoTabla,
  golesLocal: number,
  golesVisitante: number,
): PartidoConResultado {
  return {
    equipoLocalId: local.id,
    equipoVisitanteId: visitante.id,
    golesLocal,
    golesVisitante,
  };
}

describe('calcularPosiciones', () => {
  it('incluye a todos los equipos en cero cuando no hay partidos, ordenados por nombre', () => {
    // Arrange y Act
    const tabla = calcularPosiciones([C, A, B], []);

    // Assert
    expect(tabla.map((fila) => fila.equipo.nombre)).toEqual([
      'Alfa',
      'Beta',
      'Gamma',
    ]);
    expect(
      tabla.every((fila) => fila.puntos === 0 && fila.partidosJugados === 0),
    ).toBe(true);
    expect(tabla.map((fila) => fila.posicion)).toEqual([1, 2, 3]);
  });

  it('suma 3 puntos al ganador, 0 al perdedor y acumula los goles de los dos lados', () => {
    // Arrange
    const partidos = [partido(A, B, 2, 1)];

    // Act
    const [primero, segundo] = calcularPosiciones([A, B], partidos);

    // Assert
    expect(primero).toMatchObject({
      equipo: A,
      partidosJugados: 1,
      ganados: 1,
      golesAFavor: 2,
      golesEnContra: 1,
      diferenciaGoles: 1,
      puntos: 3,
    });
    expect(segundo).toMatchObject({
      equipo: B,
      perdidos: 1,
      golesAFavor: 1,
      golesEnContra: 2,
      diferenciaGoles: -1,
      puntos: 0,
    });
  });

  it('suma 1 punto a cada equipo en un empate', () => {
    const tabla = calcularPosiciones([A, B], [partido(A, B, 1, 1)]);

    expect(tabla.map((fila) => [fila.empatados, fila.puntos])).toEqual([
      [1, 1],
      [1, 1],
    ]);
  });

  it('con igualdad de puntos, desempata por diferencia de gol', () => {
    // Arrange: Alfa y Beta ganan su partido (3 puntos cada uno), Beta por más diferencia.
    const partidos = [partido(A, C, 1, 0), partido(B, D, 3, 0)];

    // Act
    const tabla = calcularPosiciones([A, B, C, D], partidos);

    // Assert
    expect(
      tabla.map((fila) => [
        fila.equipo.nombre,
        fila.puntos,
        fila.diferenciaGoles,
      ]),
    ).toEqual([
      ['Beta', 3, 3],
      ['Alfa', 3, 1],
      ['Gamma', 0, -1],
      ['Delta', 0, -3],
    ]);
  });

  it('con igualdad de puntos y diferencia de gol, desempata por goles a favor', () => {
    // Arrange: Alfa gana 2-0 y Beta 3-1 (los dos +2); Beta hizo más goles.
    const partidos = [partido(A, C, 2, 0), partido(B, D, 3, 1)];

    // Act
    const tabla = calcularPosiciones([A, B, C, D], partidos);

    // Assert: arriba Beta por goles a favor; abajo Delta (-2, 1 gol) antes que Gamma (-2, 0 goles).
    expect(tabla.map((fila) => [fila.equipo.nombre, fila.golesAFavor])).toEqual(
      [
        ['Beta', 3],
        ['Alfa', 2],
        ['Delta', 1],
        ['Gamma', 0],
      ],
    );
  });

  it('ignora los partidos de equipos que no están en la lista', () => {
    const tabla = calcularPosiciones([A, B], [partido(A, C, 5, 0)]);

    expect(tabla.every((fila) => fila.partidosJugados === 0)).toBe(true);
  });
});

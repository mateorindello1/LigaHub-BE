import { generarFixture, type FechaGenerada } from './generar-fixture.js';

/** Ids de 1 a n. */
function equipos(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i + 1);
}

/** Clave de un cruce sin importar la localía ("1-2" para 1 vs 2 y 2 vs 1). */
function clave(a: number, b: number): string {
  return [a, b].sort((x, y) => x - y).join('-');
}

/** Cantidad de partidos de local de cada equipo. */
function contarLocalias(fechas: FechaGenerada[]): Map<number, number> {
  const locales = new Map<number, number>();
  for (const partido of fechas.flatMap((fecha) => fecha.partidos)) {
    locales.set(partido.localId, (locales.get(partido.localId) ?? 0) + 1);
  }
  return locales;
}

describe('generarFixture', () => {
  it.each([2, 4, 6, 8])(
    'con %i equipos (par) genera n - 1 fechas y todos se enfrentan una sola vez',
    (n) => {
      // Act
      const fechas = generarFixture(equipos(n));

      // Assert
      expect(fechas).toHaveLength(n - 1);
      const cruces = fechas
        .flatMap((fecha) => fecha.partidos)
        .map((p) => clave(p.localId, p.visitanteId));
      expect(cruces).toHaveLength((n * (n - 1)) / 2);
      expect(new Set(cruces).size).toBe(cruces.length);
      expect(fechas.every((fecha) => fecha.equipoLibreId === null)).toBe(true);
    },
  );

  it.each([3, 5, 7])(
    'con %i equipos (impar) genera n fechas y en cada una queda libre un equipo distinto',
    (n) => {
      const fechas = generarFixture(equipos(n));

      expect(fechas).toHaveLength(n);
      const libres = fechas.map((fecha) => fecha.equipoLibreId);
      expect(new Set(libres)).toEqual(new Set(equipos(n)));
    },
  );

  it('ningún equipo juega dos veces en la misma fecha', () => {
    const fechas = generarFixture(equipos(7));

    for (const fecha of fechas) {
      const participantes = fecha.partidos.flatMap((p) => [
        p.localId,
        p.visitanteId,
      ]);
      expect(new Set(participantes).size).toBe(participantes.length);
    }
  });

  it('reparte la localía: cada equipo es local en la mitad de sus partidos, con diferencia máxima de uno', () => {
    // Arrange: 8 equipos, 7 partidos cada uno.
    const n = 8;

    // Act
    const locales = contarLocalias(generarFixture(equipos(n)));

    // Assert: 3 o 4 partidos de local.
    for (const cantidad of locales.values()) {
      expect(Math.abs(2 * cantidad - (n - 1))).toBeLessThanOrEqual(1);
    }
  });

  it('con ida y vuelta duplica las fechas y la vuelta invierte la localía de la ida', () => {
    // Act
    const fechas = generarFixture(equipos(4), true);

    // Assert
    expect(fechas.map((fecha) => fecha.numeroFecha)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    const [ida, vuelta] = [fechas[0], fechas[3]];
    expect(vuelta.partidos).toEqual(
      ida.partidos.map((p) => ({
        localId: p.visitanteId,
        visitanteId: p.localId,
      })),
    );
    // Cada equipo es local exactamente en 3 de sus 6 partidos.
    expect([...contarLocalias(fechas).values()]).toEqual([3, 3, 3, 3]);
  });

  it('rechaza menos de dos equipos o equipos repetidos', () => {
    expect(() => generarFixture([1])).toThrow('al menos dos equipos');
    expect(() => generarFixture([1, 2, 2])).toThrow('repetidos');
  });
});

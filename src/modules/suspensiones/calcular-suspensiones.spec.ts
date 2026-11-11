import { describe, expect, it } from 'vitest';
import { EstadoPartido } from '../partidos/estado-partido.enum.js';
import { TipoEvento } from '../partidos/tipo-evento.enum.js';
import {
  AMONESTACIONES_PARA_SUSPENSION,
  calcularSuspensiones,
  suspendidosEnPartido,
  type JugadorSancionado,
  type PartidoDelTorneo,
  type Tarjeta,
} from './calcular-suspensiones.js';

/** Equipos: A juega contra B en todas las fechas; C es otro equipo. */
const A = 1;
const B = 2;
const C = 3;

/** Jugadores de prueba: Pérez y Gómez de A, Díaz de B. */
const PEREZ: JugadorSancionado = {
  inscripcionJugadorId: 'ins-perez',
  jugador: { id: 1, nombres: 'Juan', apellidos: 'Pérez' },
  equipo: { id: A, nombre: 'Alfa' },
};
const GOMEZ: JugadorSancionado = {
  inscripcionJugadorId: 'ins-gomez',
  jugador: { id: 2, nombres: 'Luis', apellidos: 'Gómez' },
  equipo: { id: A, nombre: 'Alfa' },
};
const DIAZ: JugadorSancionado = {
  inscripcionJugadorId: 'ins-diaz',
  jugador: { id: 3, nombres: 'Ana', apellidos: 'Díaz' },
  equipo: { id: B, nombre: 'Beta' },
};

/** Partido de la fecha n entre A y B (id "f<n>"), con el estado indicado. */
function partido(
  numeroFecha: number,
  estadoPartido: number = EstadoPartido.Finalizado,
  local = A,
  visitante = B,
): PartidoDelTorneo {
  return {
    id: `f${numeroFecha}`,
    numeroFecha,
    estadoPartido,
    equipoLocalId: local,
    equipoVisitanteId: visitante,
  };
}

const amarilla = (
  jugador: JugadorSancionado,
  numeroFecha: number,
): Tarjeta => ({
  ...jugador,
  partidoId: `f${numeroFecha}`,
  tipoEvento: TipoEvento.Amonestacion,
});
const roja = (jugador: JugadorSancionado, numeroFecha: number): Tarjeta => ({
  ...jugador,
  partidoId: `f${numeroFecha}`,
  tipoEvento: TipoEvento.Expulsion,
});

describe('calcularSuspensiones', () => {
  it('sin tarjetas no hay sanciones', () => {
    // Act
    const resultado = calcularSuspensiones([partido(1), partido(2)], []);

    // Assert
    expect(resultado).toEqual({ sanciones: [], tarjetas: [] });
  });

  it('una expulsión suspende la fecha siguiente; queda pendiente mientras ese partido no se juegue', () => {
    // Arrange: roja a Pérez en la fecha 1; la fecha 2 todavía no se jugó.
    const partidos = [
      partido(1),
      partido(2, EstadoPartido.Programado),
      partido(3, EstadoPartido.Programado),
    ];

    // Act
    const { sanciones, tarjetas } = calcularSuspensiones(partidos, [
      roja(PEREZ, 1),
    ]);

    // Assert
    expect(sanciones).toHaveLength(1);
    expect(sanciones[0]).toMatchObject({
      motivo: 'Expulsion',
      numeroFecha: 1,
      fechas: 1,
      partidos: [{ partidoId: 'f2', numeroFecha: 2, cumplida: false }],
      cumplida: false,
    });
    expect(tarjetas[0]).toMatchObject({ expulsiones: 1, amonestaciones: 0 });
  });

  it('la sanción queda cumplida cuando se juega el partido (también por W.O.)', () => {
    // Act
    const jugado = calcularSuspensiones(
      [partido(1), partido(2)],
      [roja(PEREZ, 1)],
    );
    const porWO = calcularSuspensiones(
      [partido(1), partido(2, EstadoPartido.WO)],
      [roja(PEREZ, 1)],
    );

    // Assert
    expect(jugado.sanciones[0].cumplida).toBe(true);
    expect(porWO.sanciones[0].cumplida).toBe(true);
  });

  it('un partido suspendido no cuenta: la sanción pasa al partido siguiente del equipo', () => {
    // Arrange: la fecha 2 se suspendió.
    const partidos = [
      partido(1),
      partido(2, EstadoPartido.Suspendido),
      partido(3, EstadoPartido.Programado),
    ];

    // Act
    const { sanciones } = calcularSuspensiones(partidos, [roja(PEREZ, 1)]);

    // Assert
    expect(sanciones[0].partidos).toEqual([
      { partidoId: 'f3', numeroFecha: 3, cumplida: false },
    ]);
  });

  it('se cumple en los partidos del propio equipo, aunque no juegue todas las fechas', () => {
    // Arrange: en la fecha 2 A queda libre (juegan B y C); A vuelve a jugar en la fecha 3.
    const partidos = [
      partido(1),
      partido(2, EstadoPartido.Programado, B, C),
      partido(3, EstadoPartido.Programado, C, A),
    ];

    // Act
    const { sanciones } = calcularSuspensiones(partidos, [roja(PEREZ, 1)]);

    // Assert
    expect(sanciones[0].partidos.map((p) => p.partidoId)).toEqual(['f3']);
  });

  it(`cada ${AMONESTACIONES_PARA_SUSPENSION} amarillas acumuladas suspenden una fecha, y la cuenta vuelve a empezar`, () => {
    // Arrange: Gómez recibe una amarilla en cada una de las fechas 1 a 6.
    const partidos = [1, 2, 3, 4, 5, 6, 7].map((n) =>
      partido(n, n <= 6 ? EstadoPartido.Finalizado : EstadoPartido.Programado),
    );
    const amarillas = [1, 2, 3, 4, 5, 6].map((n) => amarilla(GOMEZ, n));

    // Act
    const { sanciones, tarjetas } = calcularSuspensiones(partidos, amarillas);

    // Assert: la quinta (fecha 5) suspende la fecha 6, que ya se jugó.
    expect(sanciones).toHaveLength(1);
    expect(sanciones[0]).toMatchObject({
      motivo: 'Amonestaciones',
      numeroFecha: 5,
      partidos: [{ partidoId: 'f6', cumplida: true }],
      cumplida: true,
    });
    expect(tarjetas[0]).toMatchObject({
      amonestaciones: 6,
      amonestacionesAcumuladas: 1,
    });
  });

  it('las amarillas del partido en que lo expulsaron no se acumulan', () => {
    // Arrange: 4 amarillas en las fechas 1 a 4, y en la 5 doble amarilla y roja.
    const partidos = [1, 2, 3, 4, 5, 6, 7].map((n) => partido(n));
    const tarjetasRecibidas = [
      ...[1, 2, 3, 4].map((n) => amarilla(GOMEZ, n)),
      amarilla(GOMEZ, 5),
      amarilla(GOMEZ, 5),
      roja(GOMEZ, 5),
    ];

    // Act
    const { sanciones, tarjetas } = calcularSuspensiones(
      partidos,
      tarjetasRecibidas,
    );

    // Assert: solo la expulsión; siguen 4 amarillas acumuladas.
    expect(sanciones.map((s) => s.motivo)).toEqual(['Expulsion']);
    expect(tarjetas[0]).toMatchObject({
      amonestaciones: 6,
      expulsiones: 1,
      amonestacionesAcumuladas: 4,
    });
  });

  it('dos sanciones seguidas se cumplen una después de la otra', () => {
    // Arrange: roja en la fecha 1 y otra en la fecha 2 (el jugador no debía jugarla, pero la
    // planilla se cargó así): la segunda empieza después de la primera.
    const partidos = [1, 2, 3, 4].map((n) =>
      partido(n, n <= 2 ? EstadoPartido.Finalizado : EstadoPartido.Programado),
    );

    // Act
    const { sanciones } = calcularSuspensiones(partidos, [
      roja(PEREZ, 1),
      roja(PEREZ, 2),
    ]);

    // Assert
    const porFecha = [...sanciones].sort(
      (a, b) => a.numeroFecha - b.numeroFecha,
    );
    expect(porFecha[0].partidos.map((p) => p.partidoId)).toEqual(['f2']);
    expect(porFecha[1].partidos.map((p) => p.partidoId)).toEqual(['f3']);
  });

  it('si al equipo no le quedan partidos, la sanción queda pendiente sin partido', () => {
    // Act
    const { sanciones } = calcularSuspensiones([partido(1)], [roja(DIAZ, 1)]);

    // Assert
    expect(sanciones[0]).toMatchObject({ partidos: [], cumplida: false });
  });

  it('ordena las sanciones pendientes primero y las tarjetas por expulsiones y amarillas', () => {
    // Arrange: Pérez, roja en la fecha 1 (cumplida en la 2); Díaz, roja en la fecha 2 (pendiente);
    // Gómez, una amarilla.
    const partidos = [
      partido(1),
      partido(2),
      partido(3, EstadoPartido.Programado),
    ];

    // Act
    const { sanciones, tarjetas } = calcularSuspensiones(partidos, [
      roja(PEREZ, 1),
      roja(DIAZ, 2),
      amarilla(GOMEZ, 1),
    ]);

    // Assert
    expect(sanciones.map((s) => [s.jugador.apellidos, s.cumplida])).toEqual([
      ['Díaz', false],
      ['Pérez', true],
    ]);
    expect(tarjetas.map((t) => t.jugador.apellidos)).toEqual([
      'Díaz',
      'Pérez',
      'Gómez',
    ]);
  });
});

describe('suspendidosEnPartido', () => {
  it('devuelve los jugadores que cumplen una sanción en ese partido', () => {
    // Arrange
    const suspensiones = calcularSuspensiones(
      [
        partido(1),
        partido(2, EstadoPartido.Programado),
        partido(3, EstadoPartido.Programado),
      ],
      [roja(PEREZ, 1), amarilla(GOMEZ, 1)],
    );

    // Act y Assert
    expect([...suspendidosEnPartido(suspensiones, 'f2')]).toEqual([
      'ins-perez',
    ]);
    expect(suspendidosEnPartido(suspensiones, 'f3').size).toBe(0);
  });
});

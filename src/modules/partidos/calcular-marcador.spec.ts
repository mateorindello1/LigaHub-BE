import { describe, expect, it } from 'vitest';
import { calcularMarcador, marcadorWO } from './calcular-marcador.js';
import { TipoEvento } from './tipo-evento.enum.js';

describe('calcularMarcador', () => {
  it('sin eventos, 0 a 0', () => {
    // Act y Assert
    expect(calcularMarcador([])).toEqual({ golesLocal: 0, golesVisitante: 0 });
  });

  it('cada gol suma al equipo del jugador y cada gol en contra, al rival', () => {
    // Arrange: 2 goles del local, 1 del visitante y un gol en contra de un visitante.
    const eventos = [
      { tipoEvento: TipoEvento.Gol, lado: 'local' as const },
      { tipoEvento: TipoEvento.Gol, lado: 'visitante' as const },
      { tipoEvento: TipoEvento.Gol, lado: 'local' as const },
      { tipoEvento: TipoEvento.GolEnContra, lado: 'visitante' as const },
    ];

    // Act
    const marcador = calcularMarcador(eventos);

    // Assert
    expect(marcador).toEqual({ golesLocal: 3, golesVisitante: 1 });
  });

  it('tarjetas y cambios no cambian el marcador', () => {
    // Arrange
    const eventos = [
      { tipoEvento: TipoEvento.Amonestacion, lado: 'local' as const },
      { tipoEvento: TipoEvento.Expulsion, lado: 'visitante' as const },
      { tipoEvento: TipoEvento.Cambio, lado: 'local' as const },
    ];

    // Act y Assert
    expect(calcularMarcador(eventos)).toEqual({
      golesLocal: 0,
      golesVisitante: 0,
    });
  });

  it('un W.O. es 3 a 0 para el equipo que se presentó', () => {
    // Act y Assert
    expect(marcadorWO('local')).toEqual({ golesLocal: 3, golesVisitante: 0 });
    expect(marcadorWO('visitante')).toEqual({
      golesLocal: 0,
      golesVisitante: 3,
    });
  });
});

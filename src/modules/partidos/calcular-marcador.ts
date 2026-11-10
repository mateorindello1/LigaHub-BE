import { TipoEvento } from './tipo-evento.enum.js';

/** Lado del partido en el que juega un equipo. */
export type Lado = 'local' | 'visitante';

/** Evento con lo mínimo necesario para calcular el marcador. */
export interface EventoParaMarcador {
  tipoEvento: TipoEvento;
  /** Lado del jugador que protagoniza el evento. */
  lado: Lado;
}

export interface Marcador {
  golesLocal: number;
  golesVisitante: number;
}

/** Goles con los que se registra un partido ganado por W.O. (no presentación del rival). */
export const GOLES_WO = 3;

/**
 * Calcula el marcador a partir de los eventos. Función pura, como calcularPosiciones.
 * - Gol: suma al equipo del jugador.
 * - Gol en contra: suma al equipo rival.
 * - El resto de los eventos no cambia el marcador.
 */
export function calcularMarcador(eventos: EventoParaMarcador[]): Marcador {
  const marcador: Marcador = { golesLocal: 0, golesVisitante: 0 };
  for (const evento of eventos) {
    if (evento.tipoEvento === TipoEvento.Gol) {
      sumarGol(marcador, evento.lado);
    } else if (evento.tipoEvento === TipoEvento.GolEnContra) {
      sumarGol(marcador, evento.lado === 'local' ? 'visitante' : 'local');
    }
  }
  return marcador;
}

/** Marcador de un partido ganado por W.O.: 3 a 0 para el equipo que se presentó. */
export function marcadorWO(ganador: Lado): Marcador {
  return ganador === 'local'
    ? { golesLocal: GOLES_WO, golesVisitante: 0 }
    : { golesLocal: 0, golesVisitante: GOLES_WO };
}

function sumarGol(marcador: Marcador, lado: Lado): void {
  if (lado === 'local') marcador.golesLocal++;
  else marcador.golesVisitante++;
}

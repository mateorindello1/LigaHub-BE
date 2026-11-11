import {
  ESTADOS_CON_RESULTADO,
  EstadoPartido,
} from '../partidos/estado-partido.enum.js';
import { TipoEvento } from '../partidos/tipo-evento.enum.js';

/** Fechas de suspensión por una expulsión (tarjeta roja). */
export const FECHAS_POR_EXPULSION = 1;

/** Amarillas que hay que acumular en el torneo para cumplir una fecha de suspensión. */
export const AMONESTACIONES_PARA_SUSPENSION = 5;

/** Fechas de suspensión por acumular amarillas. */
export const FECHAS_POR_AMONESTACIONES = 1;

// #region Tipos

/** Partido del torneo, para saber en cuáles se cumple cada suspensión. */
export interface PartidoDelTorneo {
  id: string;
  numeroFecha: number;
  estadoPartido: number;
  equipoLocalId: number;
  equipoVisitanteId: number;
}

/** Jugador amonestado o expulsado, identificado por su inscripción en el equipo. */
export interface JugadorSancionado {
  inscripcionJugadorId: string;
  jugador: { id: number; nombres: string; apellidos: string };
  equipo: { id: number; nombre: string };
}

/** Una tarjeta de un partido jugado. */
export interface Tarjeta extends JugadorSancionado {
  partidoId: string;
  tipoEvento: TipoEvento.Amonestacion | TipoEvento.Expulsion;
}

export type MotivoSancion = 'Expulsion' | 'Amonestaciones';

/** Partido en el que el jugador no puede jugar por una sanción. */
export interface PartidoSuspendido {
  partidoId: string;
  numeroFecha: number;
  /** El partido ya se jugó (o se ganó por W.O.): esa fecha de suspensión está cumplida. */
  cumplida: boolean;
}

/** Una sanción: el motivo, la fecha en que se recibió y los partidos en que se cumple. */
export interface Sancion extends JugadorSancionado {
  motivo: MotivoSancion;
  /** Fecha del fixture del partido en que se recibió. */
  numeroFecha: number;
  /** Fechas de suspensión. */
  fechas: number;
  /**
   * Próximos partidos del equipo en que la cumple. Puede tener menos que "fechas" si al equipo no
   * le quedan partidos en el torneo.
   */
  partidos: PartidoSuspendido[];
  cumplida: boolean;
}

/** Tarjetas de un jugador en el torneo. */
export interface ResumenTarjetas extends JugadorSancionado {
  amonestaciones: number;
  expulsiones: number;
  /** Amarillas que cuentan para la próxima suspensión (de 0 a AMONESTACIONES_PARA_SUSPENSION - 1). */
  amonestacionesAcumuladas: number;
}

export interface Suspensiones {
  /** Pendientes primero; después, de la más reciente a la más antigua. */
  sanciones: Sancion[];
  /** Jugadores con alguna tarjeta: más expulsiones y más amarillas primero. */
  tarjetas: ResumenTarjetas[];
}

// #endregion

/**
 * Calcula las sanciones del torneo a partir de las tarjetas de los partidos jugados. Es una
 * función pura (no consulta la base): se prueba con tests unitarios, como calcularPosiciones.
 *
 * Reglas:
 * - Una expulsión suspende FECHAS_POR_EXPULSION fecha.
 * - Cada AMONESTACIONES_PARA_SUSPENSION amarillas acumuladas en el torneo suspenden
 *   FECHAS_POR_AMONESTACIONES fecha. Las amarillas del partido en que el jugador fue expulsado no
 *   se acumulan: la expulsión ya las sanciona (por ejemplo, la doble amarilla).
 * - La suspensión se cumple en los próximos partidos del equipo, por número de fecha, a partir de
 *   la fecha siguiente. Los partidos suspendidos no cuentan: no se jugaron. Si un jugador tiene
 *   dos sanciones, las cumple una después de la otra.
 * - Una fecha de suspensión está cumplida cuando ese partido ya se jugó (o se ganó por W.O.).
 *
 * Como se calcula siempre a partir de los partidos, al corregir una planilla las sanciones se
 * actualizan solas (igual que la tabla de posiciones).
 */
export function calcularSuspensiones(
  partidos: PartidoDelTorneo[],
  tarjetas: Tarjeta[],
): Suspensiones {
  const partidoPorId = new Map(partidos.map((p) => [p.id, p]));
  const sanciones: Sancion[] = [];
  const resumenes: ResumenTarjetas[] = [];

  for (const tarjetasJugador of agruparPorJugador(tarjetas)) {
    const { inscripcionJugadorId, jugador, equipo } = tarjetasJugador[0];
    const datosJugador = { inscripcionJugadorId, jugador, equipo };
    const sancionesJugador: Omit<Sancion, 'partidos' | 'cumplida'>[] = [];
    let amonestaciones = 0;
    let expulsiones = 0;
    let acumuladas = 0;

    // Partidos del jugador con tarjetas, en orden de fecha.
    const porPartido = agrupar(tarjetasJugador, (t) => t.partidoId);
    const partidosConTarjetas = [...porPartido.keys()]
      .map((id) => partidoPorId.get(id))
      .filter((p) => p !== undefined)
      .sort((a, b) => a.numeroFecha - b.numeroFecha);

    for (const partido of partidosConTarjetas) {
      const delPartido = porPartido.get(partido.id)!;
      const amarillas = delPartido.filter(
        (t) => t.tipoEvento === TipoEvento.Amonestacion,
      ).length;
      const expulsado = delPartido.some(
        (t) => t.tipoEvento === TipoEvento.Expulsion,
      );
      amonestaciones += amarillas;

      if (expulsado) {
        expulsiones++;
        sancionesJugador.push({
          ...datosJugador,
          motivo: 'Expulsion',
          numeroFecha: partido.numeroFecha,
          fechas: FECHAS_POR_EXPULSION,
        });
        continue;
      }
      acumuladas += amarillas;
      while (acumuladas >= AMONESTACIONES_PARA_SUSPENSION) {
        acumuladas -= AMONESTACIONES_PARA_SUSPENSION;
        sancionesJugador.push({
          ...datosJugador,
          motivo: 'Amonestaciones',
          numeroFecha: partido.numeroFecha,
          fechas: FECHAS_POR_AMONESTACIONES,
        });
      }
    }

    sanciones.push(
      ...asignarPartidos(
        sancionesJugador,
        partidosDelEquipo(partidos, equipo.id),
      ),
    );
    resumenes.push({
      ...datosJugador,
      amonestaciones,
      expulsiones,
      amonestacionesAcumuladas: acumuladas,
    });
  }

  return {
    sanciones: sanciones.sort(
      (a, b) =>
        Number(a.cumplida) - Number(b.cumplida) ||
        b.numeroFecha - a.numeroFecha ||
        compararJugadores(a, b),
    ),
    tarjetas: resumenes.sort(
      (a, b) =>
        b.expulsiones - a.expulsiones ||
        b.amonestaciones - a.amonestaciones ||
        compararJugadores(a, b),
    ),
  };
}

/** Inscripciones de los jugadores que no pueden jugar ese partido por una sanción. */
export function suspendidosEnPartido(
  suspensiones: Suspensiones,
  partidoId: string,
): Set<string> {
  return new Set(
    suspensiones.sanciones
      .filter((s) => s.partidos.some((p) => p.partidoId === partidoId))
      .map((s) => s.inscripcionJugadorId),
  );
}

// #region Funciones auxiliares

function agruparPorJugador(tarjetas: Tarjeta[]): Tarjeta[][] {
  return [...agrupar(tarjetas, (t) => t.inscripcionJugadorId).values()];
}

/** Agrupa por clave conservando el orden (es Map.groupBy, que el target ES2023 todavía no trae). */
function agrupar<T, K>(elementos: T[], clave: (elemento: T) => K): Map<K, T[]> {
  const grupos = new Map<K, T[]>();
  for (const elemento of elementos) {
    const k = clave(elemento);
    grupos.set(k, [...(grupos.get(k) ?? []), elemento]);
  }
  return grupos;
}

/** Partidos del equipo que cuentan para cumplir una suspensión (no suspendidos), por fecha. */
function partidosDelEquipo(
  partidos: PartidoDelTorneo[],
  equipoId: number,
): PartidoDelTorneo[] {
  return partidos
    .filter(
      (p) =>
        (p.equipoLocalId === equipoId || p.equipoVisitanteId === equipoId) &&
        p.estadoPartido !== (EstadoPartido.Suspendido as number),
    )
    .sort((a, b) => a.numeroFecha - b.numeroFecha);
}

/**
 * Asigna a cada sanción (en el orden en que se recibieron) los partidos en que se cumple. Una
 * sanción empieza después de su fecha y después de los partidos que ocupó la anterior.
 */
function asignarPartidos(
  sanciones: Omit<Sancion, 'partidos' | 'cumplida'>[],
  partidosEquipo: PartidoDelTorneo[],
): Sancion[] {
  let siguienteLibre = 0;
  return sanciones.map((sancion) => {
    const despuesDeLaFecha = partidosEquipo.findIndex(
      (p) => p.numeroFecha > sancion.numeroFecha,
    );
    const desde = Math.max(
      siguienteLibre,
      despuesDeLaFecha === -1 ? partidosEquipo.length : despuesDeLaFecha,
    );
    const asignados = partidosEquipo.slice(desde, desde + sancion.fechas);
    siguienteLibre = desde + asignados.length;

    const partidos = asignados.map((p) => ({
      partidoId: p.id,
      numeroFecha: p.numeroFecha,
      cumplida: (ESTADOS_CON_RESULTADO as readonly number[]).includes(
        p.estadoPartido,
      ),
    }));
    return {
      ...sancion,
      partidos,
      cumplida:
        partidos.length === sancion.fechas && partidos.every((p) => p.cumplida),
    };
  });
}

function compararJugadores(a: JugadorSancionado, b: JugadorSancionado): number {
  return (
    a.jugador.apellidos.localeCompare(b.jugador.apellidos, 'es') ||
    a.jugador.nombres.localeCompare(b.jugador.nombres, 'es')
  );
}

// #endregion

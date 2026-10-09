import type { EquipoTabla, FilaPosiciones } from './calcular-posiciones.js';

/** Resultado de un partido desde el punto de vista del equipo. */
export type ResultadoPartido = 'Ganado' | 'Empatado' | 'Perdido';

/** Un partido del equipo en el torneo, visto desde el equipo. */
export interface PartidoDetalle {
  id: string;
  numeroFecha: number;
  fechaHora: Date | null;
  estadoPartido: number;
  condicion: 'Local' | 'Visitante';
  rival: { id: number; nombre: string };
  /** Null mientras el partido no tenga resultado. */
  golesAFavor: number | null;
  golesEnContra: number | null;
  resultado: ResultadoPartido | null;
  /** Null si todavía no se asignó cancha. */
  cancha: { numero: number; predio: string } | null;
}

/** Jugador inscripto en el equipo para el torneo. */
export interface JugadorDetalle {
  /** Id de la inscripción del jugador (InscripcionJugador). */
  id: string;
  jugadorId: number;
  nombres: string;
  apellidos: string;
  dorsal: number;
  capitan: boolean;
}

/** Detalle de un equipo dentro de un torneo: respuesta de GET /torneos/:torneoId/equipos/:equipoId. */
export interface DetalleEquipo {
  torneo: { id: number; nombre: string; anio: number; estadoTorneo: number };
  equipo: EquipoTabla;
  inscripcionId: string;
  /** Línea del equipo en la tabla de posiciones, con su posición. */
  posicion: Omit<FilaPosiciones, 'equipo'>;
  partidos: PartidoDetalle[];
  jugadores: JugadorDetalle[];
}

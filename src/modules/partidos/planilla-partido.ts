/** Jugador del plantel en la planilla: sus datos de inscripción y si jugó el partido. */
export interface JugadorPlanilla {
  inscripcionJugadorId: string;
  jugadorId: number;
  nombres: string;
  apellidos: string;
  dorsal: number;
  capitan: boolean;
  /** Figura entre los que participaron del partido. */
  jugo: boolean;
}

/** Uno de los dos equipos, con su plantel en el torneo. */
export interface EquipoPlanilla {
  id: number;
  nombre: string;
  escudoURL: string | null;
  plantel: JugadorPlanilla[];
}

/** Evento del partido. Los jugadores se identifican por su inscripción. */
export interface EventoPlanilla {
  id: string;
  tipoEvento: number;
  minuto: number;
  inscripcionJugadorId: string;
  /** Solo en un cambio: el jugador que entra. */
  inscripcionJugadorEntraId: string | null;
}

/** Planilla del partido: respuesta de GET y PUT /partidos/:id(/resultado). */
export interface PlanillaPartido {
  id: string;
  estadoPartido: number;
  fechaHora: Date | null;
  numeroFecha: number;
  torneo: { id: number; nombre: string; estadoTorneo: number };
  cancha: { numero: number; predio: string } | null;
  /** Null mientras no tenga resultado. */
  golesLocal: number | null;
  golesVisitante: number | null;
  local: EquipoPlanilla;
  visitante: EquipoPlanilla;
  /** Por minuto. */
  eventos: EventoPlanilla[];
}

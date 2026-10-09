/** Partido tal como se muestra en el fixture. */
export interface PartidoFixture {
  id: string;
  estadoPartido: number;
  fechaHora: Date | null;
  local: { id: number; nombre: string };
  visitante: { id: number; nombre: string };
  /** Null mientras no se haya jugado. */
  golesLocal: number | null;
  golesVisitante: number | null;
  /** Null si todavía no se asignó cancha. */
  cancha: { numero: number; predio: string } | null;
}

/** Una fecha del fixture: respuesta de GET y POST /torneos/:torneoId/fixture. */
export interface FechaFixtureVista {
  id: string;
  numeroFecha: number;
  partidos: PartidoFixture[];
  /** Equipo que no juega en esta fecha (cantidad impar de equipos). */
  equipoLibre: { id: number; nombre: string } | null;
}

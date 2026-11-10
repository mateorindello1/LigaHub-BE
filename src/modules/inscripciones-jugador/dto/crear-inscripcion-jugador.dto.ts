import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

/** Rango de los dorsales: de 1 a 99. */
export const DORSAL_MINIMO = 1;
export const DORSAL_MAXIMO = 99;

export const MENSAJE_DORSAL = `El dorsal tiene que ser un número entre ${DORSAL_MINIMO} y ${DORSAL_MAXIMO}.`;

/**
 * Datos para inscribir un jugador en el equipo
 * (cuerpo de POST /torneos/:torneoId/inscripciones/:inscripcionId/jugadores).
 * El torneo y la inscripción del equipo vienen en la ruta.
 * Los decoradores se evalúan de abajo hacia arriba: la regla más básica va abajo.
 */
export class CrearInscripcionJugadorDto {
  @Min(1, { message: 'El id del jugador debe ser mayor a 0.' })
  @IsInt({
    message: 'El id del jugador es obligatorio y debe ser un número entero.',
  })
  jugadorId: number;

  @Max(DORSAL_MAXIMO, { message: MENSAJE_DORSAL })
  @Min(DORSAL_MINIMO, { message: MENSAJE_DORSAL })
  @IsInt({ message: 'El dorsal es obligatorio y debe ser un número entero.' })
  dorsal: number;

  /** Opcional (por defecto, no). Si es capitán, el capitán anterior del equipo deja de serlo. */
  @IsBoolean({ message: 'Capitán tiene que ser true o false.' })
  @IsOptional()
  capitan?: boolean;
}

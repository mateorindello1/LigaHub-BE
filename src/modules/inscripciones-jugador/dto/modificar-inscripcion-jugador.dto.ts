import { IsBoolean, IsInt, Max, Min, ValidateIf } from 'class-validator';
import {
  DORSAL_MAXIMO,
  DORSAL_MINIMO,
  MENSAJE_DORSAL,
} from './crear-inscripcion-jugador.dto.js';

/** Valida el campo solo si vino en el pedido. A diferencia de @IsOptional, no deja pasar null. */
const siVino = ValidateIf((_objeto, valor) => valor !== undefined);

/**
 * Datos para modificar la inscripción de un jugador
 * (cuerpo de PATCH /torneos/:torneoId/inscripciones/:inscripcionId/jugadores/:id).
 * Solo se modifica lo que se envía. El jugador no se cambia: se da de baja y se inscribe otro.
 */
export class ModificarInscripcionJugadorDto {
  @Max(DORSAL_MAXIMO, { message: MENSAJE_DORSAL })
  @Min(DORSAL_MINIMO, { message: MENSAJE_DORSAL })
  @IsInt({ message: 'El dorsal debe ser un número entero.' })
  @siVino
  dorsal?: number;

  /** Si pasa a ser capitán, el capitán anterior del equipo deja de serlo. */
  @IsBoolean({ message: 'Capitán tiene que ser true o false.' })
  @siVino
  capitan?: boolean;
}

import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * Filtros del listado de jugadores (parámetros de GET /jugadores?...).
 * Los parámetros de la URL llegan como texto: @Type los convierte a número antes de validar.
 */
export class FiltroJugadoresDto {
  /**
   * Solo los jugadores que no están inscriptos en ningún equipo de este torneo: los que se pueden
   * inscribir en él (un jugador no puede jugar en dos equipos del mismo torneo).
   */
  @Min(1, { message: 'El id del torneo debe ser mayor a 0.' })
  @IsInt({ message: 'El id del torneo debe ser un número entero.' })
  @Type(() => Number)
  @IsOptional()
  disponiblesEnTorneo?: number;
}

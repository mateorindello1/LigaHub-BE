import { IsInt, IsISO8601, IsOptional, Min } from 'class-validator';

/**
 * Programación de un partido (cuerpo de PATCH /partidos/:id/programacion).
 * Solo se cambia lo que se envía; null deja el dato "a confirmar".
 */
export class ProgramarPartidoDto {
  /** Día y hora en ISO 8601 (por ejemplo, "2026-11-21T18:00:00-03:00"). */
  @IsISO8601(
    { strict: true },
    { message: 'La fecha y hora debe estar en formato ISO 8601.' },
  )
  @IsOptional()
  fechaHora?: string | null;

  @Min(1, { message: 'El id de la cancha debe ser mayor a 0.' })
  @IsInt({ message: 'El id de la cancha debe ser un número entero.' })
  @IsOptional()
  canchaId?: number | null;
}

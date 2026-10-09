import { IsBoolean, IsISO8601, IsOptional } from 'class-validator';

/**
 * Opciones para generar el fixture (cuerpo de POST /torneos/:torneoId/fixture).
 * Todo es opcional: con un cuerpo vacío se genera una sola rueda y sin fechas asignadas.
 */
export class GenerarFixtureDto {
  /** Si es true, se juega ida y vuelta (dos ruedas, con la localía invertida en la segunda). */
  @IsBoolean({ message: 'idaYVuelta debe ser true o false.' })
  @IsOptional()
  idaYVuelta?: boolean;

  /**
   * Fecha y hora de la primera fecha, en formato ISO 8601 (por ejemplo, "2026-11-07T15:00:00-03:00").
   * Las siguientes fechas se programan una semana después cada una. Si no se envía, los partidos
   * quedan sin día y hora asignados.
   */
  @IsISO8601(
    { strict: true },
    { message: 'fechaInicio debe ser una fecha en formato ISO 8601.' },
  )
  @IsOptional()
  fechaInicio?: string;
}

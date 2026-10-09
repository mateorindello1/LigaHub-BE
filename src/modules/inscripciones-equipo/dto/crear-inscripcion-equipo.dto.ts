import { IsInt, Min } from 'class-validator';

/**
 * Datos para inscribir un equipo en un torneo (cuerpo de POST /torneos/:torneoId/inscripciones).
 * El torneo viene en la ruta, no en el cuerpo.
 * Los decoradores se evalúan de abajo hacia arriba: la regla más básica va abajo.
 */
export class CrearInscripcionEquipoDto {
  @Min(1, { message: 'El id del equipo debe ser mayor a 0.' })
  @IsInt({
    message: 'El id del equipo es obligatorio y debe ser un número entero.',
  })
  equipoId: number;
}

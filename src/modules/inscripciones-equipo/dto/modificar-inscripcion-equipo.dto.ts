import { IsInt, Min } from 'class-validator';

/**
 * Datos para modificar una inscripción (cuerpo de PATCH /torneos/:torneoId/inscripciones/:id).
 * Por ahora lo único modificable es el equipo inscripto. Cuando la inscripción tenga más datos
 * (fecha, estado de pago, documentación), se agregan acá como opcionales.
 */
export class ModificarInscripcionEquipoDto {
  @Min(1, { message: 'El id del equipo debe ser mayor a 0.' })
  @IsInt({
    message: 'El id del equipo es obligatorio y debe ser un número entero.',
  })
  equipoId: number;
}

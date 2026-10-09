/**
 * Datos para crear un torneo (cuerpo de POST /torneos).
 * El estado no se recibe: todo torneo se crea en estado Inscripcion.
 * Las reglas de validación se agregan en la etapa 4.
 */
export class CrearTorneoDto {
  nombre: string;
  anio: number;
}

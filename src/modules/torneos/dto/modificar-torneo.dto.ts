/**
 * Datos para modificar un torneo (cuerpo de PATCH /torneos/:id).
 * Todos los campos son opcionales: solo se modifica lo que se envía.
 * El estado no se modifica por acá: cambia con los casos de uso (por ejemplo, al generar el fixture).
 * Las reglas de validación se agregan en la etapa 4.
 */
export class ModificarTorneoDto {
  nombre?: string;
  anio?: number;
}

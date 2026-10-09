/**
 * Transformaciones que se aplican a los campos de los DTOs antes de validarlos,
 * con el decorador @Transform de class-transformer.
 */

/** Quita los espacios de los extremos de un texto, para que "   " cuente como vacío. */
export const recortarTexto = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

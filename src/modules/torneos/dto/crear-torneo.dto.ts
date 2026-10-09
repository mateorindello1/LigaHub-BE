import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { recortarTexto } from '../../../common/validacion/transformaciones.js';

/**
 * Datos para crear un torneo (cuerpo de POST /torneos).
 * El estado no se recibe: todo torneo se crea en estado Inscripcion.
 * Los decoradores son las reglas de validación, como DataAnnotations o un validador de FluentValidation.
 *
 * Importante: class-validator evalúa los decoradores de ABAJO HACIA ARRIBA y, como el pipe usa
 * stopAtFirstError, informa solo el primero que falla. Por eso la regla más básica (el tipo) va
 * abajo de todo y la más específica (el largo o el rango) arriba.
 */
export class CrearTorneoDto {
  @MaxLength(100, { message: 'El nombre admite hasta 100 caracteres.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @IsString({ message: 'El nombre es obligatorio y debe ser un texto.' })
  @Transform(recortarTexto)
  nombre: string;

  @Max(2100, { message: 'El año no puede ser posterior a 2100.' })
  @Min(2000, { message: 'El año no puede ser anterior a 2000.' })
  @IsInt({ message: 'El año es obligatorio y debe ser un número entero.' })
  anio: number;
}

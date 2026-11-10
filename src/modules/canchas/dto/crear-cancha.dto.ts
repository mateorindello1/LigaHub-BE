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

export const MENSAJE_NUMERO_CANCHA =
  'El número de cancha tiene que ser un entero entre 1 y 99.';

/**
 * Datos para crear una cancha (cuerpo de POST /predios/:predioId/canchas).
 * El predio viene en la ruta. Los decoradores se evalúan de abajo hacia arriba.
 */
export class CrearCanchaDto {
  @Max(99, { message: MENSAJE_NUMERO_CANCHA })
  @Min(1, { message: MENSAJE_NUMERO_CANCHA })
  @IsInt({
    message: 'El número de cancha es obligatorio y debe ser un entero.',
  })
  numero: number;

  /** Por ejemplo: "Fútbol 7, césped sintético". */
  @MaxLength(200, { message: 'La descripción admite hasta 200 caracteres.' })
  @IsNotEmpty({ message: 'La descripción es obligatoria.' })
  @IsString({ message: 'La descripción es obligatoria y debe ser un texto.' })
  @Transform(recortarTexto)
  descripcion: string;
}

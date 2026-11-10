import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { recortarTexto } from '../../../common/validacion/transformaciones.js';

/**
 * Datos para crear un predio (cuerpo de POST /predios).
 * Los decoradores se evalúan de abajo hacia arriba: la regla más básica va abajo.
 */
export class CrearPredioDto {
  @MaxLength(100, { message: 'El nombre admite hasta 100 caracteres.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @IsString({ message: 'El nombre es obligatorio y debe ser un texto.' })
  @Transform(recortarTexto)
  nombre: string;

  @MaxLength(200, { message: 'La dirección admite hasta 200 caracteres.' })
  @IsNotEmpty({ message: 'La dirección es obligatoria.' })
  @IsString({ message: 'La dirección es obligatoria y debe ser un texto.' })
  @Transform(recortarTexto)
  direccion: string;
}

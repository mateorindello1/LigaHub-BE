import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, ValidateIf } from 'class-validator';
import { recortarTexto } from '../../../common/validacion/transformaciones.js';

/** Valida el campo solo si vino en el pedido. A diferencia de @IsOptional, no deja pasar null. */
const siVino = ValidateIf((_objeto, valor) => valor !== undefined);

/**
 * Datos para modificar un predio (cuerpo de PATCH /predios/:id). Solo se modifica lo que se envía.
 */
export class ModificarPredioDto {
  @MaxLength(100, { message: 'El nombre admite hasta 100 caracteres.' })
  @IsNotEmpty({ message: 'El nombre no puede quedar vacío.' })
  @IsString({ message: 'El nombre debe ser un texto.' })
  @Transform(recortarTexto)
  @siVino
  nombre?: string;

  @MaxLength(200, { message: 'La dirección admite hasta 200 caracteres.' })
  @IsNotEmpty({ message: 'La dirección no puede quedar vacía.' })
  @IsString({ message: 'La dirección debe ser un texto.' })
  @Transform(recortarTexto)
  @siVino
  direccion?: string;
}

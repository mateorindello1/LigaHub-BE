import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { recortarTexto } from '../../../common/validacion/transformaciones.js';
import { MENSAJE_NUMERO_CANCHA } from './crear-cancha.dto.js';

/** Valida el campo solo si vino en el pedido. A diferencia de @IsOptional, no deja pasar null. */
const siVino = ValidateIf((_objeto, valor) => valor !== undefined);

/**
 * Datos para modificar una cancha (cuerpo de PATCH /predios/:predioId/canchas/:id).
 * Solo se modifica lo que se envía. La cancha no cambia de predio.
 */
export class ModificarCanchaDto {
  @Max(99, { message: MENSAJE_NUMERO_CANCHA })
  @Min(1, { message: MENSAJE_NUMERO_CANCHA })
  @IsInt({ message: 'El número de cancha debe ser un entero.' })
  @siVino
  numero?: number;

  @MaxLength(200, { message: 'La descripción admite hasta 200 caracteres.' })
  @IsNotEmpty({ message: 'La descripción no puede quedar vacía.' })
  @IsString({ message: 'La descripción debe ser un texto.' })
  @Transform(recortarTexto)
  @siVino
  descripcion?: string;
}

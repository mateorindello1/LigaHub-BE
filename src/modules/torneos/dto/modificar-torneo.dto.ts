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

/** Valida el campo solo si vino en el pedido. A diferencia de @IsOptional, no deja pasar null. */
const siVino = ValidateIf((_objeto, valor) => valor !== undefined);

/**
 * Datos para modificar un torneo (cuerpo de PATCH /torneos/:id).
 * Todos los campos son opcionales: solo se modifica lo que se envía.
 * El estado no se modifica por acá: cambia con los casos de uso (por ejemplo, al generar el fixture).
 * Los decoradores se evalúan de abajo hacia arriba (ver CrearTorneoDto).
 */
export class ModificarTorneoDto {
  @MaxLength(100, { message: 'El nombre admite hasta 100 caracteres.' })
  @IsNotEmpty({ message: 'El nombre no puede quedar vacío.' })
  @IsString({ message: 'El nombre debe ser un texto.' })
  @Transform(recortarTexto)
  @siVino
  nombre?: string;

  @Max(2100, { message: 'El año no puede ser posterior a 2100.' })
  @Min(2000, { message: 'El año no puede ser anterior a 2000.' })
  @IsInt({ message: 'El año debe ser un número entero.' })
  @siVino
  anio?: number;
}

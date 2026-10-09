import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { recortarTexto } from '../../../common/validacion/transformaciones.js';

/**
 * Datos para modificar un equipo (cuerpo de PATCH /equipos/:id).
 * Solo se modifica lo que se envía. Para quitar el escudo se envía "escudoURL": null.
 * Los decoradores se evalúan de abajo hacia arriba: la regla más básica va abajo.
 */
export class ModificarEquipoDto {
  @MaxLength(100, { message: 'El nombre admite hasta 100 caracteres.' })
  @IsNotEmpty({ message: 'El nombre no puede quedar vacío.' })
  @IsString({ message: 'El nombre debe ser un texto.' })
  @Transform(recortarTexto)
  // Valida solo si vino; a diferencia de @IsOptional, no deja pasar null.
  @ValidateIf((_objeto, valor) => valor !== undefined)
  nombre?: string;

  // Acá sí se usa @IsOptional: null es un valor válido y significa "sin escudo".
  @MaxLength(500, { message: 'La URL del escudo admite hasta 500 caracteres.' })
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'El escudo debe ser una URL válida (http o https).' },
  )
  @Transform(recortarTexto)
  @IsOptional()
  escudoURL?: string | null;
}

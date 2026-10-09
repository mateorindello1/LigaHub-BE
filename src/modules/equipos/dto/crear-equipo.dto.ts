import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { recortarTexto } from '../../../common/validacion/transformaciones.js';

/**
 * Datos para crear un equipo (cuerpo de POST /equipos).
 * Los decoradores se evalúan de abajo hacia arriba: la regla más básica va abajo.
 */
export class CrearEquipoDto {
  @MaxLength(100, { message: 'El nombre admite hasta 100 caracteres.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @IsString({ message: 'El nombre es obligatorio y debe ser un texto.' })
  @Transform(recortarTexto)
  nombre: string;

  /** Opcional: el escudo se puede cargar después. */
  @MaxLength(500, { message: 'La URL del escudo admite hasta 500 caracteres.' })
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'El escudo debe ser una URL válida (http o https).' },
  )
  @Transform(recortarTexto)
  @IsOptional()
  escudoURL?: string | null;
}

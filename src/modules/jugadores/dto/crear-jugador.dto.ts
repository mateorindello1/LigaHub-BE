import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { recortarTexto } from '../../../common/validacion/transformaciones.js';

/** DNI argentino: 7 u 8 dígitos, sin puntos. */
export const PATRON_DNI = /^\d{7,8}$/;

/** Teléfono: dígitos, espacios, guiones, paréntesis y el + del código de país. */
export const PATRON_TELEFONO = /^[\d\s()+-]+$/;

/**
 * Datos para crear un jugador (cuerpo de POST /jugadores). Solo lo usa el Administrador.
 * Los decoradores se evalúan de abajo hacia arriba: la regla más básica va abajo.
 */
export class CrearJugadorDto {
  @Matches(PATRON_DNI, {
    message: 'El DNI tiene que tener 7 u 8 dígitos, sin puntos.',
  })
  @IsString({ message: 'El DNI es obligatorio.' })
  @Transform(recortarTexto)
  dni: string;

  @MaxLength(100, { message: 'Los nombres admiten hasta 100 caracteres.' })
  @IsNotEmpty({ message: 'Los nombres son obligatorios.' })
  @IsString({ message: 'Los nombres son obligatorios y deben ser un texto.' })
  @Transform(recortarTexto)
  nombres: string;

  @MaxLength(100, { message: 'Los apellidos admiten hasta 100 caracteres.' })
  @IsNotEmpty({ message: 'Los apellidos son obligatorios.' })
  @IsString({ message: 'Los apellidos son obligatorios y deben ser un texto.' })
  @Transform(recortarTexto)
  apellidos: string;

  /** Email de contacto del jugador. No es el email con el que inicia sesión su usuario. */
  @MaxLength(254, { message: 'El email admite hasta 254 caracteres.' })
  @IsEmail({}, { message: 'El email no tiene un formato válido.' })
  @IsString({ message: 'El email es obligatorio.' })
  @Transform(recortarTexto)
  email: string;

  @MaxLength(20, { message: 'El teléfono admite hasta 20 caracteres.' })
  @Matches(PATRON_TELEFONO, {
    message:
      'El teléfono solo puede tener números, espacios, guiones, paréntesis y +.',
  })
  @IsString({ message: 'El teléfono es obligatorio.' })
  @Transform(recortarTexto)
  telefono: string;

  @MaxLength(200, { message: 'La dirección admite hasta 200 caracteres.' })
  @IsNotEmpty({ message: 'La dirección es obligatoria.' })
  @IsString({ message: 'La dirección es obligatoria y debe ser un texto.' })
  @Transform(recortarTexto)
  direccion: string;
}

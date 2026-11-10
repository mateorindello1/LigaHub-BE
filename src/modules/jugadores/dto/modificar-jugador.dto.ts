import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { recortarTexto } from '../../../common/validacion/transformaciones.js';
import { PATRON_DNI, PATRON_TELEFONO } from './crear-jugador.dto.js';

/** Valida el campo solo si vino en el pedido. A diferencia de @IsOptional, no deja pasar null. */
const siVino = ValidateIf((_objeto, valor) => valor !== undefined);

/**
 * Datos para modificar un jugador (cuerpo de PATCH /jugadores/:id). Solo se modifica lo que se
 * envía.
 *
 * El Administrador puede modificar todo. El propio jugador, solo sus datos de contacto (email,
 * teléfono y dirección): el DNI, los nombres y los apellidos lo identifican y los define el
 * Administrador (lo controla el servicio, ver CAMPOS_SOLO_ADMINISTRADOR).
 */
export class ModificarJugadorDto {
  @Matches(PATRON_DNI, {
    message: 'El DNI tiene que tener 7 u 8 dígitos, sin puntos.',
  })
  @IsString({ message: 'El DNI debe ser un texto.' })
  @Transform(recortarTexto)
  @siVino
  dni?: string;

  @MaxLength(100, { message: 'Los nombres admiten hasta 100 caracteres.' })
  @IsNotEmpty({ message: 'Los nombres no pueden quedar vacíos.' })
  @IsString({ message: 'Los nombres deben ser un texto.' })
  @Transform(recortarTexto)
  @siVino
  nombres?: string;

  @MaxLength(100, { message: 'Los apellidos admiten hasta 100 caracteres.' })
  @IsNotEmpty({ message: 'Los apellidos no pueden quedar vacíos.' })
  @IsString({ message: 'Los apellidos deben ser un texto.' })
  @Transform(recortarTexto)
  @siVino
  apellidos?: string;

  @MaxLength(254, { message: 'El email admite hasta 254 caracteres.' })
  @IsEmail({}, { message: 'El email no tiene un formato válido.' })
  @IsString({ message: 'El email debe ser un texto.' })
  @Transform(recortarTexto)
  @siVino
  email?: string;

  @MaxLength(20, { message: 'El teléfono admite hasta 20 caracteres.' })
  @Matches(PATRON_TELEFONO, {
    message:
      'El teléfono solo puede tener números, espacios, guiones, paréntesis y +.',
  })
  @IsString({ message: 'El teléfono debe ser un texto.' })
  @Transform(recortarTexto)
  @siVino
  telefono?: string;

  @MaxLength(200, { message: 'La dirección admite hasta 200 caracteres.' })
  @IsNotEmpty({ message: 'La dirección no puede quedar vacía.' })
  @IsString({ message: 'La dirección debe ser un texto.' })
  @Transform(recortarTexto)
  @siVino
  direccion?: string;
}

/** Campos que solo modifica el Administrador: identifican al jugador. */
export const CAMPOS_SOLO_ADMINISTRADOR = [
  'dni',
  'nombres',
  'apellidos',
] as const satisfies readonly (keyof ModificarJugadorDto)[];

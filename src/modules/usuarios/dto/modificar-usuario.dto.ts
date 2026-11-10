import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import type { Rol } from '../../../common/seguridad/rol.enum.js';
import { recortarTexto } from '../../../common/validacion/transformaciones.js';
import { MENSAJE_ROLES, VALORES_ROL } from './crear-usuario.dto.js';

/** Valida el campo solo si vino en el pedido. A diferencia de @IsOptional, no deja pasar null. */
const siVino = ValidateIf((_objeto, valor) => valor !== undefined);

/**
 * Datos para modificar un usuario (cuerpo de PATCH /usuarios/:id). Solo se modifica lo que se
 * envía. La contraseña se cambia aparte (PATCH /usuarios/:id/contrasenia).
 */
export class ModificarUsuarioDto {
  @MaxLength(254, { message: 'El email admite hasta 254 caracteres.' })
  @IsEmail({}, { message: 'El email no tiene un formato válido.' })
  @IsString({ message: 'El email debe ser un texto.' })
  @Transform(recortarTexto)
  @siVino
  email?: string;

  @ArrayUnique({ message: 'Los roles no se pueden repetir.' })
  @IsIn(VALORES_ROL, { each: true, message: MENSAJE_ROLES })
  @ArrayNotEmpty({ message: 'El usuario tiene que tener al menos un rol.' })
  @IsArray({ message: 'Los roles deben ser una lista.' })
  @siVino
  roles?: Rol[];

  /** null quita el jugador asociado. */
  @Min(1, { message: 'El id del jugador debe ser mayor a 0.' })
  @IsInt({ message: 'El id del jugador debe ser un número entero.' })
  @IsOptional()
  jugadorId?: number | null;
}

import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { recortarTexto } from '../../../common/validacion/transformaciones.js';

/**
 * Datos para iniciar sesión (cuerpo de POST /auth/login).
 * Los decoradores se evalúan de abajo hacia arriba: la regla más básica va abajo.
 */
export class IniciarSesionDto {
  @MaxLength(254, { message: 'El email admite hasta 254 caracteres.' })
  @IsEmail({}, { message: 'El email no tiene un formato válido.' })
  @IsString({ message: 'El email es obligatorio.' })
  @Transform(recortarTexto)
  email: string;

  /** La contraseña no se recorta: un espacio al principio o al final es parte de ella. */
  @MaxLength(200, { message: 'La contraseña admite hasta 200 caracteres.' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @IsString({ message: 'La contraseña es obligatoria.' })
  contrasenia: string;
}

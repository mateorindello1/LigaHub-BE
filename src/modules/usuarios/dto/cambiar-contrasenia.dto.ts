import { IsString, MaxLength, MinLength } from 'class-validator';
import { LARGO_MINIMO_CONTRASENIA } from './crear-usuario.dto.js';

/** Nueva contraseña de un usuario (cuerpo de PATCH /usuarios/:id/contrasenia). */
export class CambiarContraseniaDto {
  @MaxLength(200, { message: 'La contraseña admite hasta 200 caracteres.' })
  @MinLength(LARGO_MINIMO_CONTRASENIA, {
    message: `La contraseña tiene que tener al menos ${LARGO_MINIMO_CONTRASENIA} caracteres.`,
  })
  @IsString({ message: 'La contraseña es obligatoria.' })
  contrasenia: string;
}

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
  MinLength,
} from 'class-validator';
import { Rol } from '../../../common/seguridad/rol.enum.js';
import { recortarTexto } from '../../../common/validacion/transformaciones.js';

/** Largo mínimo de las contraseñas (recomendación de OWASP para contraseñas sin otro factor). */
export const LARGO_MINIMO_CONTRASENIA = 12;

/**
 * Valores válidos de rol (1, 2 y 3). No se usa @IsEnum(Rol): en un enum numérico de TypeScript
 * también están los nombres ("Administrador"…), y @IsEnum los aceptaría como texto.
 */
export const VALORES_ROL = Object.values(Rol).filter(
  (valor) => typeof valor === 'number',
);

export const MENSAJE_ROLES =
  'Cada rol tiene que ser 1 (Administrador), 2 (Asistente) o 3 (Jugador).';

/**
 * Datos para crear un usuario (cuerpo de POST /usuarios). Solo lo usa el Administrador.
 * Los decoradores se evalúan de abajo hacia arriba: la regla más básica va abajo.
 */
export class CrearUsuarioDto {
  @MaxLength(254, { message: 'El email admite hasta 254 caracteres.' })
  @IsEmail({}, { message: 'El email no tiene un formato válido.' })
  @IsString({ message: 'El email es obligatorio.' })
  @Transform(recortarTexto)
  email: string;

  /** La contraseña no se recorta: un espacio al principio o al final es parte de ella. */
  @MaxLength(200, { message: 'La contraseña admite hasta 200 caracteres.' })
  @MinLength(LARGO_MINIMO_CONTRASENIA, {
    message: `La contraseña tiene que tener al menos ${LARGO_MINIMO_CONTRASENIA} caracteres.`,
  })
  @IsString({ message: 'La contraseña es obligatoria.' })
  contrasenia: string;

  /** Roles del usuario: al menos uno, sin repetir. */
  @ArrayUnique({ message: 'Los roles no se pueden repetir.' })
  @IsIn(VALORES_ROL, { each: true, message: MENSAJE_ROLES })
  @ArrayNotEmpty({ message: 'El usuario tiene que tener al menos un rol.' })
  @IsArray({ message: 'Los roles son obligatorios.' })
  roles: Rol[];

  /** Jugador asociado: obligatorio con el rol Jugador y prohibido sin él (lo valida el servicio). */
  @Min(1, { message: 'El id del jugador debe ser mayor a 0.' })
  @IsInt({ message: 'El id del jugador debe ser un número entero.' })
  @IsOptional()
  jugadorId?: number | null;
}

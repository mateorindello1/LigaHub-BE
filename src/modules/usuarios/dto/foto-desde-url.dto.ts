import { Transform } from 'class-transformer';
import { IsString, IsUrl, MaxLength } from 'class-validator';
import { recortarTexto } from '../../../common/validacion/transformaciones.js';

/**
 * Dirección de una imagen de internet para usar como foto (cuerpo de PUT /usuarios/yo/foto/url).
 * Acá se valida el formato; las reglas de seguridad (redes bloqueadas, puertos) las aplica
 * DescargadorImagenes al conectar.
 */
export class FotoDesdeUrlDto {
  @MaxLength(2000, { message: 'La dirección admite hasta 2000 caracteres.' })
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'La dirección tiene que empezar con http:// o https://.' },
  )
  @IsString({ message: 'La dirección es obligatoria.' })
  @Transform(recortarTexto)
  url: string;
}

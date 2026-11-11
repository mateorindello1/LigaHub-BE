import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ParseIdPipe } from '../../common/validacion/parse-id.pipe.js';
import type { UsuarioDeSesion } from '../auth/contenido-token.js';
import { UsuarioActual } from '../auth/usuario-actual.decorator.js';
import { FotoDesdeUrlDto } from './dto/foto-desde-url.dto.js';
import { TAMANIO_MAXIMO_FOTO, TIPO_FOTO } from './fotos-perfil.constantes.js';
import { FotosPerfilService } from './fotos-perfil.service.js';
import type { UsuarioConRoles } from './usuario.js';

/** Lo que se usa del archivo que deja multer: el contenido, en memoria. */
interface ArchivoSubido {
  buffer: Buffer;
}

/**
 * Fotos de perfil. Sin @Roles: cualquier usuario que haya iniciado sesión sube o quita la suya;
 * ver la de otro es solo para el Administrador (lo controla el servicio).
 *
 * Las rutas "yo/foto" tienen dos tramos, así que no chocan con "/usuarios/:id" del
 * controller de usuarios.
 */
@ApiTags('Usuarios')
@ApiBearerAuth()
@Controller('usuarios')
export class FotosPerfilController {
  constructor(private readonly fotosPerfil: FotosPerfilService) {}

  /**
   * Sube o reemplaza la foto del usuario de la sesión. Recibe un formulario multipart con el
   * archivo en el campo "foto" (JPG, PNG o WebP, hasta 2 MB). Devuelve el usuario actualizado.
   *
   * FileInterceptor usa multer (como IFormFile en ASP.NET Core): deja el archivo en memoria y
   * corta el pedido con 413 si supera el tamaño máximo, sin leerlo entero.
   */
  @Put('yo/foto')
  @UseInterceptors(
    FileInterceptor('foto', {
      limits: { fileSize: TAMANIO_MAXIMO_FOTO, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { foto: { type: 'string', format: 'binary' } },
      required: ['foto'],
    },
  })
  subir(
    @UsuarioActual() sesion: UsuarioDeSesion,
    @UploadedFile() archivo: ArchivoSubido | undefined,
  ): Promise<UsuarioConRoles> {
    return this.fotosPerfil.subir(sesion.sub, archivo?.buffer);
  }

  /**
   * Usa como foto una imagen de internet: la API la descarga y la procesa igual que un archivo
   * subido. Tiene el mismo límite de pedidos por IP que el login (5 por minuto), para que no se
   * use la API para descargar en cantidad.
   */
  @Put('yo/foto/url')
  @UseGuards(ThrottlerGuard)
  subirDesdeUrl(
    @UsuarioActual() sesion: UsuarioDeSesion,
    @Body() dto: FotoDesdeUrlDto,
  ): Promise<UsuarioConRoles> {
    return this.fotosPerfil.subirDesdeUrl(sesion.sub, dto.url);
  }

  /** Quita la foto del usuario de la sesión. Devuelve el usuario actualizado. */
  @Delete('yo/foto')
  quitar(@UsuarioActual() sesion: UsuarioDeSesion): Promise<UsuarioConRoles> {
    return this.fotosPerfil.quitar(sesion.sub);
  }

  /**
   * Devuelve la foto de un usuario (image/webp). Solo la propia, salvo el Administrador.
   * Se pide con el token, así que el frontend la descarga con fetch y no con un <img src>.
   */
  @Get(':id/foto')
  async obtener(
    @Param('id', ParseIdPipe) id: number,
    @UsuarioActual() sesion: UsuarioDeSesion,
  ): Promise<StreamableFile> {
    const foto = await this.fotosPerfil.obtener(id, sesion);
    // StreamableFile: Nest envía el contenido binario con su tipo, como File(bytes, tipo) en .NET.
    return new StreamableFile(foto, { type: TIPO_FOTO });
  }
}

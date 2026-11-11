import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import sharp from 'sharp';
import { Rol } from '../../common/seguridad/rol.enum.js';
import type { ConfiguracionAlmacenamiento } from '../../config/configuracion.js';
import {
  AlmacenamientoService,
  CONFIGURACION_ALMACENAMIENTO,
} from '../almacenamiento/almacenamiento.service.js';
import type { UsuarioDeSesion } from '../auth/contenido-token.js';
import { DescargadorImagenes } from './descargador-imagenes.js';
import { LADO_FOTO, TIPO_FOTO } from './fotos-perfil.constantes.js';
import type { UsuarioConRoles } from './usuario.js';
import { UsuariosRepository } from './usuarios.repository.js';

/** Formatos aceptados, según el contenido real del archivo (no la extensión). */
const FORMATOS_ACEPTADOS = new Set(['jpeg', 'png', 'webp']);

export const MENSAJE_FORMATO_INVALIDO =
  'El archivo tiene que ser una imagen JPG, PNG o WebP.';

/**
 * Fotos de perfil: cada usuario sube o quita la suya, y la ven el propio usuario y el
 * Administrador.
 *
 * La imagen subida no se guarda tal cual: se vuelve a generar con sharp (recortada a 256 × 256 y
 * en WebP). Así:
 * - se valida que sea una imagen de verdad, mirando su contenido y no la extensión;
 * - se descartan los metadatos EXIF, que pueden traer la ubicación GPS de donde se sacó la foto;
 * - se descarta cualquier contenido escondido en el archivo;
 * - todas las fotos pesan poco (unos pocos KB).
 *
 * Equivale a procesar un IFormFile con ImageSharp y guardarlo con BlobContainerClient en .NET.
 */
@Injectable()
export class FotosPerfilService {
  private readonly logger = new Logger(FotosPerfilService.name);

  constructor(
    private readonly usuariosRepository: UsuariosRepository,
    private readonly almacenamiento: AlmacenamientoService,
    @Inject(CONFIGURACION_ALMACENAMIENTO)
    private readonly configuracion: ConfiguracionAlmacenamiento,
    private readonly descargador: DescargadorImagenes,
  ) {}

  /**
   * Usa como foto una imagen de internet: la descarga (con las protecciones de
   * DescargadorImagenes) y sigue igual que una subida.
   */
  async subirDesdeUrl(
    usuarioId: number,
    direccion: string,
  ): Promise<UsuarioConRoles> {
    await this.obtenerUsuario(usuarioId);
    const contenido = await this.descargador.descargar(direccion);
    return this.subir(usuarioId, contenido);
  }

  /**
   * Reemplaza la foto del usuario. La anterior se borra del almacenamiento.
   * @throws BadRequestException si no llega archivo o no es una imagen JPG, PNG o WebP.
   */
  async subir(
    usuarioId: number,
    contenido: Buffer | undefined,
  ): Promise<UsuarioConRoles> {
    if (!contenido || contenido.length === 0) {
      throw new BadRequestException('Elegí una imagen para subir.');
    }
    // El nombre de la foto anterior se guarda antes de actualizar, para borrarla al final.
    const { fotoPerfil: anterior } = await this.obtenerUsuario(usuarioId);
    const foto = await this.procesar(contenido);

    // Nombre aleatorio: no se puede deducir de quién es ni adivinar el de otro usuario.
    const nombre = `${randomUUID()}.webp`;
    await this.almacenamiento.subir(
      this.configuracion.contenedorFotos,
      nombre,
      foto,
      TIPO_FOTO,
    );

    let actualizado: UsuarioConRoles;
    try {
      actualizado = await this.usuariosRepository.cambiarFotoPerfil(
        usuarioId,
        nombre,
      );
    } catch (error) {
      // Si no se pudo guardar en la base, el archivo nuevo quedaría huérfano: se borra.
      await this.borrarArchivo(nombre);
      throw error;
    }

    await this.borrarArchivo(anterior);
    return actualizado;
  }

  /** Quita la foto del usuario. Si no tenía, no hace nada. */
  async quitar(usuarioId: number): Promise<UsuarioConRoles> {
    const usuario = await this.obtenerUsuario(usuarioId);
    const anterior = usuario.fotoPerfil;
    if (!anterior) return usuario;
    const actualizado = await this.usuariosRepository.cambiarFotoPerfil(
      usuarioId,
      null,
    );
    await this.borrarArchivo(anterior);
    return actualizado;
  }

  /**
   * Devuelve la foto de un usuario. La ve el propio usuario y el Administrador.
   * @throws ForbiddenException si es la foto de otro y no es Administrador (antes que el 404,
   * para no revelar qué usuarios tienen foto).
   * @throws NotFoundException si el usuario no existe o no tiene foto.
   */
  async obtener(usuarioId: number, sesion: UsuarioDeSesion): Promise<Buffer> {
    const esPropia = sesion.sub === usuarioId;
    if (!esPropia && !sesion.roles.includes(Rol.Administrador)) {
      throw new ForbiddenException('No tenés permiso para ver esta foto.');
    }

    const usuario = await this.usuariosRepository.obtenerPorId(usuarioId);
    const foto =
      usuario?.fotoPerfil &&
      (await this.almacenamiento.descargar(
        this.configuracion.contenedorFotos,
        usuario.fotoPerfil,
      ));
    if (!foto) {
      throw new NotFoundException('El usuario no tiene foto de perfil.');
    }
    return foto;
  }

  /**
   * Borra un archivo de foto del almacenamiento. Un error no interrumpe la operación (la base ya
   * quedó bien): solo deja un archivo huérfano, que se registra en el log.
   */
  async borrarArchivo(nombre: string | null): Promise<void> {
    if (!nombre) return;
    try {
      await this.almacenamiento.borrar(
        this.configuracion.contenedorFotos,
        nombre,
      );
    } catch {
      this.logger.warn(
        `No se pudo borrar la foto ${nombre} del almacenamiento.`,
      );
    }
  }

  // #region Métodos privados
  private async obtenerUsuario(id: number): Promise<UsuarioConRoles> {
    const usuario = await this.usuariosRepository.obtenerPorId(id);
    if (!usuario) {
      throw new NotFoundException(`No existe el usuario ${id}.`);
    }
    return usuario;
  }

  /**
   * Valida que el archivo sea una imagen aceptada y la vuelve a generar: rota según la
   * orientación de la cámara, recorta al centro a 256 × 256 y la guarda en WebP sin metadatos.
   */
  private async procesar(contenido: Buffer): Promise<Buffer> {
    try {
      const { format } = await sharp(contenido).metadata();
      if (!format || !FORMATOS_ACEPTADOS.has(format)) {
        throw new BadRequestException(MENSAJE_FORMATO_INVALIDO);
      }
      return await sharp(contenido, { failOn: 'error' })
        .rotate()
        .resize(LADO_FOTO, LADO_FOTO, { fit: 'cover' })
        .webp({ quality: 80 })
        .toBuffer();
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      // sharp no pudo leerlo: no es una imagen o está dañada.
      throw new BadRequestException(MENSAJE_FORMATO_INVALIDO);
    }
  }
  // #endregion
}

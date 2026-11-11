import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import sharp from 'sharp';
import { beforeEach, describe, expect, it } from 'vitest';
import { Rol } from '../../common/seguridad/rol.enum.js';
import type { AlmacenamientoService } from '../almacenamiento/almacenamiento.service.js';
import type { UsuarioDeSesion } from '../auth/contenido-token.js';
import type { DescargadorImagenes } from './descargador-imagenes.js';
import { LADO_FOTO } from './fotos-perfil.constantes.js';
import {
  FotosPerfilService,
  MENSAJE_FORMATO_INVALIDO,
} from './fotos-perfil.service.js';
import type { UsuarioConRoles } from './usuario.js';
import type { UsuariosRepository } from './usuarios.repository.js';

/**
 * Tests del servicio de fotos de perfil: la imagen se procesa con sharp de verdad, y el
 * almacenamiento y la base se reemplazan por versiones en memoria.
 */

/** Almacenamiento falso: un Map de nombre a contenido. */
class AlmacenamientoEnMemoria {
  archivos = new Map<string, { contenido: Buffer; tipo: string }>();
  subir(_contenedor: string, nombre: string, contenido: Buffer, tipo: string) {
    this.archivos.set(nombre, { contenido, tipo });
    return Promise.resolve();
  }
  descargar(_contenedor: string, nombre: string) {
    return Promise.resolve(this.archivos.get(nombre)?.contenido ?? null);
  }
  borrar(_contenedor: string, nombre: string) {
    this.archivos.delete(nombre);
    return Promise.resolve();
  }
}

/** Repositorio falso con dos usuarios: 1 (Jugador) y 2 (Asistente). */
class RepositorioEnMemoria {
  usuarios: UsuarioConRoles[] = [1, 2].map((id) => ({
    id,
    email: `usuario${id}@ligahub.test`,
    fotoPerfil: null,
    jugadorId: null,
    jugador: null,
    roles: [id === 1 ? Rol.Jugador : Rol.Asistente],
  }));
  obtenerPorId(id: number) {
    return Promise.resolve(this.usuarios.find((u) => u.id === id) ?? null);
  }
  cambiarFotoPerfil(id: number, fotoPerfil: string | null) {
    const usuario = this.usuarios.find((u) => u.id === id)!;
    usuario.fotoPerfil = fotoPerfil;
    return Promise.resolve({ ...usuario });
  }
}

/** Imagen de prueba generada con sharp, en el formato indicado. */
function imagen(formato: 'png' | 'jpeg' | 'gif', ancho = 800, alto = 600) {
  return sharp({
    create: {
      width: ancho,
      height: alto,
      channels: 3,
      background: '#1565c0',
    },
  })
    .toFormat(formato)
    .toBuffer();
}

/** Usuario de la sesión con el id y el rol indicados. */
const sesionDe = (sub: number, rol: Rol): UsuarioDeSesion => ({
  sub,
  email: `usuario${sub}@ligahub.test`,
  roles: [rol],
  jugadorId: null,
});

describe('FotosPerfilService', () => {
  let almacenamiento: AlmacenamientoEnMemoria;
  let repositorio: RepositorioEnMemoria;
  let servicio: FotosPerfilService;

  beforeEach(() => {
    // Arrange: almacenamiento vacío y usuarios sin foto.
    almacenamiento = new AlmacenamientoEnMemoria();
    repositorio = new RepositorioEnMemoria();
    servicio = new FotosPerfilService(
      repositorio as unknown as UsuariosRepository,
      almacenamiento as unknown as AlmacenamientoService,
      {
        cadenaConexion: 'UseDevelopmentStorage=true',
        contenedorFotos: 'fotos',
      },
      // Descargador falso: la "imagen de internet" es un PNG generado en el test.
      {
        descargar: async () => imagen('png'),
      } as unknown as DescargadorImagenes,
    );
  });

  describe('subir', () => {
    it('guarda la foto recortada a 256 × 256, en WebP y con un nombre aleatorio', async () => {
      // Act
      const usuario = await servicio.subir(1, await imagen('png'));

      // Assert
      expect(usuario.fotoPerfil).toMatch(/^[0-9a-f-]{36}\.webp$/);
      const guardada = almacenamiento.archivos.get(usuario.fotoPerfil!)!;
      expect(guardada.tipo).toBe('image/webp');
      const { format, width, height } = await sharp(
        guardada.contenido,
      ).metadata();
      expect({ format, width, height }).toEqual({
        format: 'webp',
        width: LADO_FOTO,
        height: LADO_FOTO,
      });
    });

    it('descarta los metadatos EXIF de la foto original', async () => {
      // Arrange: un JPG con datos EXIF (por ejemplo, la cámara o la ubicación).
      const conExif = await sharp(await imagen('jpeg'))
        .withExif({ IFD0: { Make: 'Cámara de prueba' } })
        .toBuffer();
      expect((await sharp(conExif).metadata()).exif).toBeDefined();

      // Act
      const usuario = await servicio.subir(1, conExif);

      // Assert
      const guardada = almacenamiento.archivos.get(usuario.fotoPerfil!)!;
      expect((await sharp(guardada.contenido).metadata()).exif).toBeUndefined();
    });

    it('al reemplazarla, borra la foto anterior del almacenamiento', async () => {
      // Arrange
      const primera = await servicio.subir(1, await imagen('png'));

      // Act
      const segunda = await servicio.subir(1, await imagen('jpeg'));

      // Assert
      expect(segunda.fotoPerfil).not.toBe(primera.fotoPerfil);
      expect([...almacenamiento.archivos.keys()]).toEqual([segunda.fotoPerfil]);
    });

    it.each([
      ['un texto con extensión de imagen', Buffer.from('no soy una imagen')],
      ['un archivo vacío', Buffer.alloc(0)],
    ])('rechaza %s con 400', async (_caso, contenido) => {
      // Act y Assert
      await expect(servicio.subir(1, contenido)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(almacenamiento.archivos.size).toBe(0);
    });

    it('rechaza un formato de imagen no aceptado (GIF)', async () => {
      // Act y Assert
      await expect(servicio.subir(1, await imagen('gif'))).rejects.toThrow(
        MENSAJE_FORMATO_INVALIDO,
      );
    });
  });

  describe('subirDesdeUrl', () => {
    it('descarga la imagen y la guarda igual que una subida', async () => {
      // Act
      const usuario = await servicio.subirDesdeUrl(
        1,
        'https://ejemplo.com/foto.png',
      );

      // Assert
      expect(usuario.fotoPerfil).toMatch(/\.webp$/);
      expect(almacenamiento.archivos.size).toBe(1);
    });
  });

  describe('quitar', () => {
    it('quita la foto de la base y del almacenamiento', async () => {
      // Arrange
      await servicio.subir(1, await imagen('png'));

      // Act
      const usuario = await servicio.quitar(1);

      // Assert
      expect(usuario.fotoPerfil).toBeNull();
      expect(almacenamiento.archivos.size).toBe(0);
    });
  });

  describe('obtener', () => {
    it('el propio usuario y el Administrador ven la foto', async () => {
      // Arrange
      await servicio.subir(1, await imagen('png'));

      // Act
      const propia = await servicio.obtener(1, sesionDe(1, Rol.Jugador));
      const comoAdmin = await servicio.obtener(
        1,
        sesionDe(99, Rol.Administrador),
      );

      // Assert
      expect(propia.length).toBeGreaterThan(0);
      expect(comoAdmin).toEqual(propia);
    });

    it('otro usuario que no es Administrador recibe 403, tenga foto o no', async () => {
      // Act y Assert: el 403 va antes del 404, para no revelar quién tiene foto.
      await expect(
        servicio.obtener(1, sesionDe(2, Rol.Asistente)),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('sin foto responde 404', async () => {
      // Act y Assert
      await expect(
        servicio.obtener(1, sesionDe(1, Rol.Jugador)),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

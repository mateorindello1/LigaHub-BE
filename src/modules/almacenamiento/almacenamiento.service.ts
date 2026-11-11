import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  BlobServiceClient,
  type ContainerClient,
  RestError,
} from '@azure/storage-blob';
import type { ConfiguracionAlmacenamiento } from '../../config/configuracion.js';

/** Clave de inyección de la configuración del almacenamiento (ver AlmacenamientoModule). */
export const CONFIGURACION_ALMACENAMIENTO = Symbol(
  'CONFIGURACION_ALMACENAMIENTO',
);

/** Mensaje para cuando no se puede llegar al almacenamiento (por ejemplo, Azurite apagado). */
export const MENSAJE_ALMACENAMIENTO_NO_DISPONIBLE =
  'El almacenamiento de archivos no está disponible. Intentá de nuevo más tarde.';

/**
 * Guarda, lee y borra archivos en Azure Blob Storage. En desarrollo, el mismo código habla con
 * Azurite (el emulador local): solo cambia la cadena de conexión del .env.
 *
 * Un "contenedor" es como una carpeta de primer nivel y un "blob" es un archivo dentro de él.
 * Los contenedores se crean privados: nada se puede leer sin la clave de la cuenta, así que los
 * archivos se sirven a través de la API, que controla los permisos.
 *
 * Equivale a envolver BlobServiceClient de Azure.Storage.Blobs en un servicio propio de .NET.
 */
@Injectable()
export class AlmacenamientoService {
  private readonly logger = new Logger(AlmacenamientoService.name);
  private readonly cliente: BlobServiceClient;
  /** Contenedores ya verificados: se crean una sola vez, la primera vez que se usan. */
  private readonly contenedores = new Map<string, Promise<ContainerClient>>();

  constructor(
    @Inject(CONFIGURACION_ALMACENAMIENTO)
    configuracion: ConfiguracionAlmacenamiento,
  ) {
    this.cliente = BlobServiceClient.fromConnectionString(
      configuracion.cadenaConexion,
    );
  }

  /** Guarda un archivo. Si ya existe uno con ese nombre, lo reemplaza. */
  async subir(
    contenedor: string,
    nombre: string,
    contenido: Buffer,
    tipo: string,
  ): Promise<void> {
    await this.ejecutar(async () => {
      const cliente = await this.obtenerContenedor(contenedor);
      await cliente.getBlockBlobClient(nombre).uploadData(contenido, {
        blobHTTPHeaders: { blobContentType: tipo },
      });
    });
  }

  /** Devuelve el contenido de un archivo, o null si no existe. */
  async descargar(contenedor: string, nombre: string): Promise<Buffer | null> {
    return this.ejecutar(async () => {
      const cliente = await this.obtenerContenedor(contenedor);
      try {
        return await cliente.getBlobClient(nombre).downloadToBuffer();
      } catch (error) {
        if (error instanceof RestError && error.statusCode === 404) {
          return null;
        }
        throw error;
      }
    });
  }

  /** Borra un archivo. Si no existe, no hace nada. */
  async borrar(contenedor: string, nombre: string): Promise<void> {
    await this.ejecutar(async () => {
      const cliente = await this.obtenerContenedor(contenedor);
      await cliente.getBlobClient(nombre).deleteIfExists();
    });
  }

  // #region Métodos privados
  /**
   * Devuelve el cliente del contenedor y lo crea si no existe (privado). Se hace al usarlo y no
   * al arrancar: si el almacenamiento está apagado, la API arranca igual y solo fallan las fotos.
   */
  private obtenerContenedor(nombre: string): Promise<ContainerClient> {
    let contenedor = this.contenedores.get(nombre);
    if (!contenedor) {
      const cliente = this.cliente.getContainerClient(nombre);
      contenedor = cliente.createIfNotExists().then(() => cliente);
      // Si falla (por ejemplo, Azurite apagado), se vuelve a intentar en el próximo pedido.
      contenedor.catch(() => this.contenedores.delete(nombre));
      this.contenedores.set(nombre, contenedor);
    }
    return contenedor;
  }

  /**
   * Ejecuta una operación y traduce los errores del almacenamiento a un 503 con un mensaje claro.
   * El detalle queda en el log: al cliente no se le muestran mensajes internos.
   */
  private async ejecutar<T>(operacion: () => Promise<T>): Promise<T> {
    try {
      return await operacion();
    } catch (error) {
      this.logger.error(
        'Error del almacenamiento de archivos',
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException(
        MENSAJE_ALMACENAMIENTO_NO_DISPONIBLE,
      );
    }
  }
  // #endregion
}

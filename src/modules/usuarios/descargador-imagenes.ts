import { lookup as buscarEnDns } from 'node:dns';
import http, { type IncomingMessage } from 'node:http';
import https from 'node:https';
import { BlockList, isIP, type LookupFunction } from 'node:net';
import { BadRequestException, Injectable } from '@nestjs/common';
import { TAMANIO_MAXIMO_FOTO } from './fotos-perfil.constantes.js';

/** Redirecciones que se siguen como máximo (cada una se vuelve a validar). */
const MAXIMO_REDIRECCIONES = 3;

/** Tiempo máximo de toda la descarga, en milisegundos. */
const TIEMPO_MAXIMO_MS = 10_000;

export const MENSAJE_DIRECCION_NO_PERMITIDA =
  'Esa dirección no está permitida. Usá la dirección pública de una imagen (http o https).';
export const MENSAJE_NO_SE_PUDO_DESCARGAR =
  'No se pudo descargar una imagen de esa dirección.';
export const MENSAJE_IMAGEN_GRANDE =
  'La imagen de esa dirección supera los 2 MB.';

/**
 * Redes a las que la API nunca se conecta: privadas, locales, de enlace local (ahí está el
 * servicio de credenciales de Azure, 169.254.169.254) y reservadas.
 */
const REDES_BLOQUEADAS = new BlockList();
for (const [red, prefijo] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  REDES_BLOQUEADAS.addSubnet(red, prefijo, 'ipv4');
}
for (const [red, prefijo] of [
  ['::', 128],
  ['::1', 128],
  ['64:ff9b::', 96],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  REDES_BLOQUEADAS.addSubnet(red, prefijo, 'ipv6');
}

/**
 * Indica si una IP es pública (no está en ninguna red bloqueada). Una IPv4 escrita como IPv6
 * (::ffff:127.0.0.1) se revisa como IPv4.
 */
export function esDireccionPublica(ip: string): boolean {
  const familia = isIP(ip);
  if (familia === 0) return false;
  const ipv4Mapeada = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (ipv4Mapeada) return !REDES_BLOQUEADAS.check(ipv4Mapeada[1], 'ipv4');
  return !REDES_BLOQUEADAS.check(ip, familia === 6 ? 'ipv6' : 'ipv4');
}

/** Error que se muestra tal cual al usuario (400). */
class ErrorDescarga extends BadRequestException {}

/**
 * Descarga una imagen de una dirección de internet, para usarla como foto de perfil.
 *
 * La descarga la hace el servidor, así que hay que impedir que alguien la use para llegar a
 * lugares a los que solo la API tiene acceso (ataque SSRF, Server-Side Request Forgery): la
 * propia máquina, la red interna, Azurite o el servicio de credenciales de Azure. Por eso:
 * - solo http y https, en los puertos 80 y 443, y sin usuario ni contraseña en la dirección;
 * - la IP se valida **al conectar** (en el lookup del DNS que usa el socket), no antes: así no se
 *   puede engañar con un nombre que primero resuelve a una IP pública y después a una privada
 *   (DNS rebinding);
 * - cada redirección se vuelve a validar, con un máximo de 3;
 * - hay un tiempo máximo y un tamaño máximo (se corta la descarga apenas lo supera).
 *
 * Usa node:http/https y no fetch, porque permiten controlar el lookup del DNS de cada conexión.
 * En .NET sería un HttpClient con un SocketsHttpHandler.ConnectCallback que valida la IP.
 */
@Injectable()
export class DescargadorImagenes {
  /**
   * Descarga la imagen y devuelve su contenido.
   * @throws BadRequestException con un mensaje para el usuario si la dirección no está permitida,
   * no responde, no es una imagen o es demasiado grande.
   */
  async descargar(direccion: string): Promise<Buffer> {
    let url = this.validarUrl(direccion);
    const limite = Date.now() + TIEMPO_MAXIMO_MS;

    for (let salto = 0; salto <= MAXIMO_REDIRECCIONES; salto++) {
      const respuesta = await this.pedir(url, limite);
      const { statusCode = 0, headers } = respuesta;

      if (statusCode >= 300 && statusCode < 400 && headers.location) {
        respuesta.resume();
        // La dirección nueva puede ser relativa; se valida igual que la original.
        url = this.validarUrl(new URL(headers.location, url).toString());
        continue;
      }
      if (statusCode !== 200) {
        respuesta.resume();
        throw new ErrorDescarga(MENSAJE_NO_SE_PUDO_DESCARGAR);
      }
      if (!headers['content-type']?.startsWith('image/')) {
        respuesta.resume();
        throw new ErrorDescarga(
          'La dirección no es de una imagen. Copiá la dirección de la imagen, no la de la página.',
        );
      }
      return this.leer(respuesta);
    }
    throw new ErrorDescarga(MENSAJE_NO_SE_PUDO_DESCARGAR);
  }

  /**
   * Indica si la API se puede conectar a esa IP. Es protected para que el test la pueda
   * reemplazar y probar la descarga contra un servidor local.
   */
  protected esPermitida(ip: string): boolean {
    return esDireccionPublica(ip);
  }

  /** Indica si se permite el puerto ('' es el del protocolo). Protected por el mismo motivo. */
  protected esPuertoPermitido(puerto: string): boolean {
    return ['', '80', '443'].includes(puerto);
  }

  // #region Métodos privados
  /** Valida el formato de la dirección: protocolo, puerto, sin credenciales y, si es una IP, que esté permitida. */
  private validarUrl(direccion: string): URL {
    let url: URL;
    try {
      url = new URL(direccion);
    } catch {
      throw new ErrorDescarga(MENSAJE_DIRECCION_NO_PERMITIDA);
    }
    const ipLiteral = url.hostname.replace(/^\[|\]$/g, '');
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      !this.esPuertoPermitido(url.port) ||
      url.username ||
      url.password ||
      // Una IP escrita directamente no pasa por el DNS: se valida acá.
      (isIP(ipLiteral) !== 0 && !this.esPermitida(ipLiteral))
    ) {
      throw new ErrorDescarga(MENSAJE_DIRECCION_NO_PERMITIDA);
    }
    return url;
  }

  /** Hace el pedido GET, validando la IP en el momento de conectar. */
  private pedir(url: URL, limite: number): Promise<IncomingMessage> {
    return new Promise((resolver, rechazar) => {
      const cliente = url.protocol === 'https:' ? https : http;
      const pedido = cliente.get(
        url,
        {
          headers: { Accept: 'image/*', 'User-Agent': 'LigaHub' },
          timeout: Math.max(limite - Date.now(), 1),
          lookup: this.buscarDireccionPermitida,
        },
        resolver,
      );
      // El timeout de Node corta solo si la conexión queda inactiva. Este reloj limita la descarga
      // completa: un servidor que manda un byte por segundo no la deja colgada.
      const reloj = setTimeout(
        () => pedido.destroy(new ErrorDescarga(MENSAJE_NO_SE_PUDO_DESCARGAR)),
        Math.max(limite - Date.now(), 1),
      );
      pedido.on('close', () => clearTimeout(reloj));
      pedido.on('timeout', () =>
        pedido.destroy(new ErrorDescarga(MENSAJE_NO_SE_PUDO_DESCARGAR)),
      );
      pedido.on('error', (error) =>
        rechazar(
          error instanceof ErrorDescarga
            ? error
            : new ErrorDescarga(MENSAJE_NO_SE_PUDO_DESCARGAR),
        ),
      );
    });
  }

  /**
   * Reemplazo del lookup del DNS que usa el socket: resuelve el nombre y rechaza la conexión si
   * alguna de las IP no está permitida. Node lo llama con all: true (prueba IPv4 e IPv6) o sin él.
   */
  private readonly buscarDireccionPermitida: LookupFunction = (
    nombre,
    opciones,
    callback,
  ) => {
    buscarEnDns(nombre, { ...opciones, all: true }, (error, direcciones) => {
      if (error) {
        callback(error, []);
        return;
      }
      if (
        direcciones.length === 0 ||
        direcciones.some(({ address }) => !this.esPermitida(address))
      ) {
        callback(new ErrorDescarga(MENSAJE_DIRECCION_NO_PERMITIDA), []);
        return;
      }
      if (opciones.all) {
        callback(null, direcciones);
      } else {
        callback(null, direcciones[0].address, direcciones[0].family);
      }
    });
  };

  /** Lee el cuerpo de la respuesta, cortando la descarga apenas supera el tamaño máximo. */
  private leer(respuesta: IncomingMessage): Promise<Buffer> {
    return new Promise((resolver, rechazar) => {
      const partes: Buffer[] = [];
      let tamanio = 0;
      respuesta.on('data', (parte: Buffer) => {
        tamanio += parte.length;
        if (tamanio > TAMANIO_MAXIMO_FOTO) {
          respuesta.destroy(new ErrorDescarga(MENSAJE_IMAGEN_GRANDE));
          return;
        }
        partes.push(parte);
      });
      respuesta.on('end', () => resolver(Buffer.concat(partes)));
      respuesta.on('error', (error) =>
        rechazar(
          error instanceof ErrorDescarga
            ? error
            : new ErrorDescarga(MENSAJE_NO_SE_PUDO_DESCARGAR),
        ),
      );
    });
  }
  // #endregion
}

import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { BadRequestException } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  DescargadorImagenes,
  esDireccionPublica,
  MENSAJE_DIRECCION_NO_PERMITIDA,
  MENSAJE_IMAGEN_GRANDE,
  MENSAJE_NO_SE_PUDO_DESCARGAR,
} from './descargador-imagenes.js';

/**
 * Tests del descargador de imágenes: las protecciones contra SSRF y la descarga en sí, contra
 * un servidor HTTP local (sin salir a internet).
 */

describe('esDireccionPublica', () => {
  it.each([
    ['8.8.8.8', true],
    ['2800:3f0:4002:80f::200e', true],
    ['127.0.0.1', false],
    ['10.1.2.3', false],
    ['172.20.0.5', false],
    ['192.168.1.10', false],
    ['169.254.169.254', false],
    ['100.64.0.1', false],
    ['0.0.0.0', false],
    ['::1', false],
    ['fe80::1', false],
    ['fd00::1', false],
    ['::ffff:127.0.0.1', false],
    ['no-es-una-ip', false],
  ])('%s → %s', (ip, esperado) => {
    // Act y Assert
    expect(esDireccionPublica(ip)).toBe(esperado);
  });
});

describe('DescargadorImagenes', () => {
  const descargador = new DescargadorImagenes();

  it.each([
    ['otro protocolo', 'ftp://ejemplo.com/foto.png'],
    ['otro puerto', 'http://ejemplo.com:8080/foto.png'],
    ['usuario y contraseña', 'http://usuario:clave@ejemplo.com/foto.png'],
    ['la propia máquina', 'http://127.0.0.1/foto.png'],
    ['la propia máquina en IPv6', 'http://[::1]/foto.png'],
    ['las credenciales de Azure', 'http://169.254.169.254/metadata'],
    ['la red interna', 'http://192.168.0.1/foto.png'],
    ['un nombre que resuelve a la propia máquina', 'http://localhost/foto.png'],
    ['una dirección mal formada', 'no es una dirección'],
  ])('rechaza %s', async (_caso, direccion) => {
    // Act y Assert
    await expect(descargador.descargar(direccion)).rejects.toThrow(
      MENSAJE_DIRECCION_NO_PERMITIDA,
    );
  });

  describe('descarga (contra un servidor local)', () => {
    /** PNG de 1 × 1 píxel. */
    const PNG = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64',
    );
    let servidor: Server;
    let base: string;

    /**
     * El descargador real rechaza 127.0.0.1 y los puertos que no son 80 ni 443. Para el test se
     * habilita solo esa IP y el puerto del servidor local; todo lo demás sigue bloqueado.
     */
    class DescargadorDePrueba extends DescargadorImagenes {
      protected esPermitida(ip: string): boolean {
        return ip === '127.0.0.1' || esDireccionPublica(ip);
      }
      protected esPuertoPermitido(): boolean {
        return true;
      }
    }
    const deprueba = new DescargadorDePrueba();

    beforeAll(async () => {
      // Arrange: un servidor con una imagen, una redirección, una página, una imagen enorme...
      servidor = createServer((pedido, respuesta) => {
        switch (pedido.url) {
          case '/foto.png':
            respuesta.writeHead(200, { 'Content-Type': 'image/png' });
            respuesta.end(PNG);
            return;
          case '/redirige':
            respuesta.writeHead(302, { Location: '/foto.png' });
            respuesta.end();
            return;
          case '/redirige-a-privada':
            respuesta.writeHead(302, {
              Location: 'http://169.254.169.254/metadata',
            });
            respuesta.end();
            return;
          case '/pagina':
            respuesta.writeHead(200, { 'Content-Type': 'text/html' });
            respuesta.end('<html></html>');
            return;
          case '/grande':
            respuesta.writeHead(200, { 'Content-Type': 'image/png' });
            respuesta.end(Buffer.alloc(3 * 1024 * 1024));
            return;
          default:
            respuesta.writeHead(404);
            respuesta.end();
        }
      });
      await new Promise<void>((listo) =>
        servidor.listen(0, '127.0.0.1', listo),
      );
      base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
    });

    afterAll(() => {
      servidor.close();
    });

    it('descarga una imagen', async () => {
      // Act
      const contenido = await deprueba.descargar(`${base}/foto.png`);

      // Assert
      expect(contenido).toEqual(PNG);
    });

    it('sigue una redirección y la valida', async () => {
      // Act y Assert
      await expect(deprueba.descargar(`${base}/redirige`)).resolves.toEqual(
        PNG,
      );
      await expect(
        deprueba.descargar(`${base}/redirige-a-privada`),
      ).rejects.toThrow(MENSAJE_DIRECCION_NO_PERMITIDA);
    });

    it('rechaza una página que no es una imagen, una respuesta 404 y una imagen de más de 2 MB', async () => {
      // Act y Assert
      await expect(deprueba.descargar(`${base}/pagina`)).rejects.toThrow(
        'no es de una imagen',
      );
      await expect(deprueba.descargar(`${base}/no-existe`)).rejects.toThrow(
        MENSAJE_NO_SE_PUDO_DESCARGAR,
      );
      await expect(deprueba.descargar(`${base}/grande`)).rejects.toThrow(
        MENSAJE_IMAGEN_GRANDE,
      );
    });

    it('todos los errores son 400 con un mensaje para el usuario', async () => {
      // Act y Assert
      await expect(
        deprueba.descargar(`${base}/no-existe`),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});

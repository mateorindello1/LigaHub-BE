import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';
import type { DetalleError, RespuestaError } from './respuesta-error.js';

/** Nombre de cada error según su código HTTP. */
const NOMBRES_ERROR: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Solicitud inválida',
  [HttpStatus.UNAUTHORIZED]: 'No autenticado',
  [HttpStatus.FORBIDDEN]: 'Acceso denegado',
  [HttpStatus.NOT_FOUND]: 'No encontrado',
  [HttpStatus.CONFLICT]: 'Conflicto',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Demasiados pedidos',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Error interno',
};

/** Resultado de interpretar una excepción. */
interface ErrorResuelto {
  estado: number;
  mensaje: string;
  detalles?: DetalleError[];
}

/**
 * Filtro global de excepciones: toda respuesta de error sale con el formato RespuestaError.
 * Equivale al middleware de manejo de errores de ASP.NET Core.
 *
 * Los errores inesperados se registran en el log con su detalle, pero al cliente solo le llega
 * un mensaje genérico: nunca se exponen trazas ni mensajes internos de la base.
 */
@Catch()
export class ExcepcionesFilter implements ExceptionFilter {
  private readonly logger = new Logger(ExcepcionesFilter.name);

  catch(excepcion: unknown, host: ArgumentsHost): void {
    const contexto = host.switchToHttp();
    const pedido = contexto.getRequest<Request>();
    const respuesta = contexto.getResponse<Response>();

    const { estado, mensaje, detalles } = this.resolver(excepcion);

    // Solo los errores del servidor se registran: los 4xx son errores del cliente, esperables.
    if (estado >= 500) {
      this.logger.error(
        `${pedido.method} ${pedido.url}`,
        excepcion instanceof Error ? excepcion.stack : String(excepcion),
      );
    }

    const cuerpo: RespuestaError = {
      estado,
      error: NOMBRES_ERROR[estado] ?? 'Error',
      mensaje,
      ...(detalles && { detalles }),
      ruta: pedido.url,
      fecha: new Date().toISOString(),
    };

    respuesta.status(estado).json(cuerpo);
  }

  /** Traduce cada tipo de excepción a un código HTTP y un mensaje. */
  private resolver(excepcion: unknown): ErrorResuelto {
    // #region Excepciones HTTP (las lanzadas por el código propio o por Nest)
    if (excepcion instanceof HttpException) {
      const estado = excepcion.getStatus();
      const contenido = excepcion.getResponse();

      if (typeof contenido === 'string') {
        return { estado, mensaje: contenido };
      }

      // Formato propio (pipe de validación) o el de Nest: { message, error, statusCode }.
      const { mensaje, detalles, message } = contenido as {
        mensaje?: string;
        detalles?: DetalleError[];
        message?: string | string[];
      };

      // Ruta inexistente: Nest responde "Cannot GET /ruta".
      if (
        estado === 404 &&
        typeof message === 'string' &&
        message.startsWith('Cannot ')
      ) {
        return { estado, mensaje: 'La ruta solicitada no existe.' };
      }

      // JSON mal formado en el cuerpo: Nest convierte el SyntaxError del parser de Express
      // en un 400 con el mensaje original en inglés (por ejemplo, "Unexpected end of JSON input").
      if (
        estado === 400 &&
        typeof message === 'string' &&
        message.includes('JSON')
      ) {
        return {
          estado,
          mensaje: 'El cuerpo del pedido no es un JSON válido.',
        };
      }

      return {
        estado,
        mensaje:
          mensaje ??
          (Array.isArray(message) ? message.join(' ') : message) ??
          excepcion.message,
        detalles,
      };
    }
    // #endregion

    // #region Errores conocidos de Prisma (restricciones de la base)
    if (excepcion instanceof Prisma.PrismaClientKnownRequestError) {
      switch (excepcion.code) {
        // Violación de clave única.
        case 'P2002':
          return {
            estado: HttpStatus.CONFLICT,
            mensaje: 'Ya existe un registro con esos datos.',
          };
        // Violación de clave foránea: el registro está referenciado o la referencia no existe.
        case 'P2003':
          return {
            estado: HttpStatus.CONFLICT,
            mensaje:
              'La operación no es posible porque hay datos relacionados.',
          };
        // El registro a modificar o borrar no existe.
        case 'P2025':
          return {
            estado: HttpStatus.NOT_FOUND,
            mensaje: 'El registro no existe.',
          };
      }
    }
    // #endregion

    // Cualquier otro error es inesperado.
    return {
      estado: HttpStatus.INTERNAL_SERVER_ERROR,
      mensaje: 'Ocurrió un error interno. Intentá de nuevo más tarde.',
    };
  }
}

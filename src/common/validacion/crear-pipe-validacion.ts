import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import type { DetalleError } from '../errores/respuesta-error.js';

/**
 * Crea el pipe de validación global. Valida el cuerpo de cada pedido contra las
 * reglas del DTO (decoradores de class-validator), como FluentValidation en el pipeline.
 */
export function crearPipeValidacion(): ValidationPipe {
  return new ValidationPipe({
    // Convierte el cuerpo del pedido en una instancia del DTO (necesario para aplicar @Transform).
    transform: true,
    // Lista blanca: descarta los campos que no están declarados en el DTO...
    whitelist: true,
    // ...y además rechaza el pedido si los trae. Evita la asignación masiva (por ejemplo, mandar "estadoTorneo").
    forbidNonWhitelisted: true,
    // Informa solo el primer error de cada campo (los decoradores se evalúan de abajo hacia arriba).
    stopAtFirstError: true,
    // Arma el error en el formato propio de la API, con los mensajes agrupados por campo.
    exceptionFactory: (errores: ValidationError[]) =>
      new BadRequestException({
        mensaje: 'Los datos enviados no son válidos.',
        detalles: aplanarErrores(errores),
      }),
  });
}

/** Convierte el árbol de errores de class-validator en una lista de campos con sus mensajes. */
function aplanarErrores(
  errores: ValidationError[],
  rutaPadre = '',
): DetalleError[] {
  return errores.flatMap((error) => {
    const campo = rutaPadre ? `${rutaPadre}.${error.property}` : error.property;

    // Un campo que no está en el DTO llega con la restricción "whitelistValidation", en inglés.
    const mensajes = Object.entries(error.constraints ?? {}).map(
      ([restriccion, mensaje]) =>
        restriccion === 'whitelistValidation'
          ? 'Este campo no está permitido.'
          : mensaje,
    );

    const propios = mensajes.length > 0 ? [{ campo, mensajes }] : [];
    return [...propios, ...aplanarErrores(error.children ?? [], campo)];
  });
}

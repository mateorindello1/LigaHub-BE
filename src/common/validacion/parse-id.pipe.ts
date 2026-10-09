import { BadRequestException, Injectable, ParseIntPipe } from '@nestjs/common';

/**
 * Convierte el parámetro :id de la ruta a número entero.
 * Igual que ParseIntPipe de Nest, pero con el mensaje de error en castellano.
 */
@Injectable()
export class ParseIdPipe extends ParseIntPipe {
  constructor() {
    super({
      exceptionFactory: () =>
        new BadRequestException('El id debe ser un número entero.'),
    });
  }
}

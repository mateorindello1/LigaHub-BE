import { BadRequestException, Injectable, ParseUUIDPipe } from '@nestjs/common';

/**
 * Valida que un parámetro de la ruta sea un UUID (las claves uniqueidentifier de la base).
 * Igual que ParseUUIDPipe de Nest, pero con el mensaje de error en castellano.
 */
@Injectable()
export class ParseUuidPipe extends ParseUUIDPipe {
  constructor() {
    super({
      exceptionFactory: () =>
        new BadRequestException('El id debe ser un identificador UUID válido.'),
    });
  }
}

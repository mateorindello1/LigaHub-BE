import { Module } from '@nestjs/common';
import { leerConfiguracion } from '../../config/configuracion.js';
import {
  AlmacenamientoService,
  CONFIGURACION_ALMACENAMIENTO,
} from './almacenamiento.service.js';

/**
 * Almacenamiento de archivos en Azure Blob Storage (Azurite en desarrollo). Lo usan las fotos de
 * perfil; más adelante, los documentos de las inscripciones.
 */
@Module({
  providers: [
    AlmacenamientoService,
    // Cadena de conexión y contenedores, leídos del .env (como IOptions<T> en .NET).
    {
      provide: CONFIGURACION_ALMACENAMIENTO,
      useFactory: () => leerConfiguracion().almacenamiento,
    },
  ],
  exports: [AlmacenamientoService, CONFIGURACION_ALMACENAMIENTO],
})
export class AlmacenamientoModule {}

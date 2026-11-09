import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/** Ruta donde se publica Swagger UI (la especificación JSON queda en /docs-json). */
export const RUTA_DOCUMENTACION = 'docs';

/**
 * Publica la documentación de la API con Swagger UI, como Swashbuckle en ASP.NET Core.
 * La especificación OpenAPI se arma a partir de los controllers y los DTOs; el plugin
 * de @nestjs/swagger (configurado en nest-cli.json) agrega las propiedades y reglas de cada DTO.
 */
export function configurarSwagger(app: INestApplication): void {
  const configuracion = new DocumentBuilder()
    .setTitle('LigaHub API')
    .setDescription(
      'API del sistema de gestión de torneos de fútbol LigaHub. ' +
        'Las respuestas de error tienen el formato { estado, error, mensaje, detalles?, ruta, fecha }. ' +
        'Los endpoints con candado requieren iniciar sesión: pedir un token en POST /auth/login y ' +
        'cargarlo con el botón Authorize.',
    )
    .setVersion('0.1.0')
    // Token JWT en el encabezado "Authorization: Bearer <token>" (botón Authorize).
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();

  const documento = SwaggerModule.createDocument(app, configuracion);
  SwaggerModule.setup(RUTA_DOCUMENTACION, app, documento, {
    customSiteTitle: 'LigaHub API',
    // Mantiene el token cargado al recargar la página.
    swaggerOptions: { persistAuthorization: true },
  });
}

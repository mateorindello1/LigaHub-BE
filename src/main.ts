// Carga las variables de .env en process.env antes de crear la aplicación.
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Encabezados HTTP de seguridad (por ejemplo, evita que la API se cargue dentro de un iframe ajeno).
  app.use(helmet());

  // CORS: solo los orígenes de CORS_ORIGIN (separados por coma) pueden llamar a la API desde un navegador.
  // Si la variable no está definida, no se habilita CORS y el navegador bloquea los pedidos de otros orígenes.
  const origenesPermitidos = process.env.CORS_ORIGIN?.split(',')
    .map((origen) => origen.trim())
    .filter(Boolean);
  if (origenesPermitidos?.length) {
    app.enableCors({ origin: origenesPermitidos });
  }

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();

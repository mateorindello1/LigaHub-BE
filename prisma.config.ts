// Configuración de Prisma (Prisma 7): ubicación del schema, de las migraciones
// y cadena de conexión, que se lee de la variable de entorno DATABASE_URL (.env).
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // Comando de pnpm db:seed (prisma db seed). tsx ejecuta TypeScript sin compilar antes.
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});

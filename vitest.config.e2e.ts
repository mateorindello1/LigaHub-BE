import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Carga .env antes de los tests: la app se conecta a la base al iniciar y necesita DATABASE_URL.
    setupFiles: ['dotenv/config'],
    // Un archivo por vez: todos usan la misma base y algunos modifican partidos del seed por un
    // momento (y los restauran). En paralelo, un test podía ver los cambios temporales de otro.
    fileParallelism: false,
  },
});

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
  },
});

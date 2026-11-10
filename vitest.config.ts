import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`.
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    // Cobertura (pnpm test:cov): todo el código propio, aunque ningún test lo cargue (así cuenta
    // como 0 % y no desaparece del reporte). Se excluye lo generado por Prisma y los tests.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/generated/**', 'src/**/*.spec.ts', 'src/main.ts'],
      reporter: ['text-summary', 'text', 'html'],
    },
  },
});

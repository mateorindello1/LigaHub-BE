import { describe, expect, it } from 'vitest';
import { leerConfiguracion } from './configuracion.js';

/** Variables válidas de base; cada test cambia la que prueba. */
const VALIDAS = {
  DATABASE_URL: 'sqlserver://localhost:1433;database=Prueba',
  JWT_SECRET: 'x'.repeat(32),
};

describe('leerConfiguracion', () => {
  it('lee la configuración y usa 8h como duración por defecto', () => {
    // Act
    const configuracion = leerConfiguracion(VALIDAS);

    // Assert
    expect(configuracion.cadenaConexion).toBe(VALIDAS.DATABASE_URL);
    expect(configuracion.jwt).toEqual({
      secreto: VALIDAS.JWT_SECRET,
      duracion: '8h',
    });
  });

  it('respeta JWT_DURACION si es válida', () => {
    // Act
    const configuracion = leerConfiguracion({
      ...VALIDAS,
      JWT_DURACION: '30m',
    });

    // Assert
    expect(configuracion.jwt.duracion).toBe('30m');
  });

  it.each([
    ['falta DATABASE_URL', { DATABASE_URL: '' }, 'Falta DATABASE_URL'],
    ['falta JWT_SECRET', { JWT_SECRET: undefined }, 'Falta JWT_SECRET'],
    [
      'JWT_SECRET corto',
      { JWT_SECRET: 'corto' },
      'JWT_SECRET debe tener al menos 32 caracteres',
    ],
    [
      'JWT_DURACION inválida',
      { JWT_DURACION: '8 horas' },
      'JWT_DURACION tiene un formato inválido',
    ],
  ])('falla si %s', (_caso, cambio, mensaje) => {
    // Act y Assert
    expect(() => leerConfiguracion({ ...VALIDAS, ...cambio })).toThrow(mensaje);
  });

  it('informa todos los errores juntos', () => {
    // Act y Assert
    expect(() => leerConfiguracion({})).toThrow(
      /DATABASE_URL[\s\S]*JWT_SECRET/,
    );
  });
});

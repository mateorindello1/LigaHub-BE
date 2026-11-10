import { describe, expect, it } from 'vitest';
import { aMilisegundos, leerConfiguracion } from './configuracion.js';

/** Variables válidas de base; cada test cambia la que prueba. */
const VALIDAS = {
  DATABASE_URL: 'sqlserver://localhost:1433;database=Prueba',
  JWT_SECRET: 'x'.repeat(32),
};

describe('leerConfiguracion', () => {
  it('lee la configuración y usa los valores por defecto de la sesión', () => {
    // Act
    const configuracion = leerConfiguracion(VALIDAS);

    // Assert: token de acceso de 15 minutos, sesión de 7 días y cookie SameSite=Strict.
    expect(configuracion.cadenaConexion).toBe(VALIDAS.DATABASE_URL);
    expect(configuracion.jwt).toEqual({
      secreto: VALIDAS.JWT_SECRET,
      duracion: '15m',
    });
    expect(configuracion.sesion).toEqual({
      duracionRefresco: 7 * 86_400_000,
      sameSite: 'strict',
    });
  });

  it('respeta REFRESCO_DURACION y COOKIE_SAMESITE si son válidas', () => {
    // Act
    const configuracion = leerConfiguracion({
      ...VALIDAS,
      REFRESCO_DURACION: '12h',
      COOKIE_SAMESITE: 'None',
    });

    // Assert
    expect(configuracion.sesion).toEqual({
      duracionRefresco: 12 * 3_600_000,
      sameSite: 'none',
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
    [
      'REFRESCO_DURACION inválida',
      { REFRESCO_DURACION: '1 semana' },
      'REFRESCO_DURACION tiene un formato inválido',
    ],
    [
      'COOKIE_SAMESITE inválido',
      { COOKIE_SAMESITE: 'a veces' },
      'COOKIE_SAMESITE tiene un valor inválido',
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

  it.each([
    ['30s', 30_000],
    ['15m', 900_000],
    ['8h', 28_800_000],
    ['7d', 604_800_000],
    ['8 horas', null],
  ])('aMilisegundos("%s") devuelve %s', (duracion, esperado) => {
    // Act y Assert
    expect(aMilisegundos(duracion)).toBe(esperado);
  });
});

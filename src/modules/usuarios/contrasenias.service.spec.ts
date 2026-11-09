import { describe, expect, it } from 'vitest';
import { ContraseniasService } from './contrasenias.service.js';

describe('ContraseniasService', () => {
  const servicio = new ContraseniasService();

  it('genera un hash Argon2id con los parámetros de OWASP, sin la contraseña en claro', async () => {
    // Act
    const hash = await servicio.generarHash('Contraseña de prueba 123');

    // Assert
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(hash).not.toContain('Contraseña de prueba 123');
  });

  it('genera hashes distintos para la misma contraseña (sal aleatoria)', async () => {
    // Act
    const [primero, segundo] = await Promise.all([
      servicio.generarHash('misma contraseña'),
      servicio.generarHash('misma contraseña'),
    ]);

    // Assert
    expect(primero).not.toBe(segundo);
  });

  it('verifica la contraseña correcta y rechaza una incorrecta', async () => {
    // Arrange
    const hash = await servicio.generarHash('correcta');

    // Act y Assert
    expect(await servicio.verificar(hash, 'correcta')).toBe(true);
    expect(await servicio.verificar(hash, 'incorrecta')).toBe(false);
    expect(await servicio.verificar(hash, 'Correcta')).toBe(false);
  });

  it('devuelve false si el hash guardado no tiene formato válido', async () => {
    // Act y Assert
    expect(await servicio.verificar('no-es-un-hash', 'lo que sea')).toBe(false);
  });
});

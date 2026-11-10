import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Equipo, Prisma } from '../../generated/prisma/client.js';
import type { EquiposRepository } from './equipos.repository.js';
import { EquiposService } from './equipos.service.js';

/** Repositorio falso en memoria. Compara nombres sin mayúsculas, como la intercalación de la base. */
class RepositorioEnMemoria {
  equipos: Equipo[] = [];
  /** Ids de los equipos con inscripciones o partidos. */
  conDatos = new Set<number>();
  private proximoId = 1;

  obtenerPorId(id: number) {
    return Promise.resolve(this.equipos.find((e) => e.id === id) ?? null);
  }
  existeConNombre(nombre: string, excluirId?: number) {
    return Promise.resolve(
      this.equipos.some(
        (e) =>
          e.nombre.toLowerCase() === nombre.toLowerCase() && e.id !== excluirId,
      ),
    );
  }
  crear(datos: Prisma.EquipoCreateInput) {
    const equipo = { ...datos, id: this.proximoId++ } as Equipo;
    this.equipos.push(equipo);
    return Promise.resolve(equipo);
  }
  modificar(id: number, datos: Prisma.EquipoUpdateInput) {
    const equipo = this.equipos.find((e) => e.id === id)!;
    for (const [campo, valor] of Object.entries(datos)) {
      if (valor !== undefined) Object.assign(equipo, { [campo]: valor });
    }
    return Promise.resolve(equipo);
  }
  borrar(id: number) {
    this.equipos = this.equipos.filter((e) => e.id !== id);
    return Promise.resolve();
  }
  tieneDatosAsociados(id: number) {
    return Promise.resolve(this.conDatos.has(id));
  }
}

describe('EquiposService', () => {
  let repositorio: RepositorioEnMemoria;
  let servicio: EquiposService;

  beforeEach(() => {
    repositorio = new RepositorioEnMemoria();
    servicio = new EquiposService(repositorio as unknown as EquiposRepository);
  });

  it('crea un equipo sin escudo como null', async () => {
    // Act
    const equipo = await servicio.crear({ nombre: 'Los Halcones' });

    // Assert
    expect(equipo).toMatchObject({ nombre: 'Los Halcones', escudoURL: null });
  });

  it('el nombre no se repite, sin importar mayúsculas', async () => {
    // Arrange
    await servicio.crear({ nombre: 'Los Halcones' });

    // Act y Assert
    await expect(servicio.crear({ nombre: 'los halcones' })).rejects.toThrow(
      'Ya existe un equipo llamado "los halcones".',
    );
  });

  it('modificar con el mismo nombre no lo toma como repetido; null quita el escudo', async () => {
    // Arrange
    const equipo = await servicio.crear({
      nombre: 'Los Halcones',
      escudoURL: 'https://ejemplo.com/escudo.png',
    });

    // Act
    const modificado = await servicio.modificar(equipo.id, {
      nombre: 'Los Halcones',
      escudoURL: null,
    });

    // Assert
    expect(modificado).toMatchObject({
      nombre: 'Los Halcones',
      escudoURL: null,
    });
  });

  it('no borra un equipo con inscripciones o partidos', async () => {
    // Arrange
    const equipo = await servicio.crear({ nombre: 'Los Halcones' });
    repositorio.conDatos.add(equipo.id);

    // Act y Assert
    await expect(servicio.borrar(equipo.id)).rejects.toThrow(ConflictException);
  });
});

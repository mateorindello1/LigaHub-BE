import { ConflictException, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { Rol } from '../../common/seguridad/rol.enum.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { UsuarioDeSesion } from '../auth/contenido-token.js';
import type { CrearJugadorDto } from './dto/crear-jugador.dto.js';
import type {
  AsociadosJugador,
  JugadorConUsuario,
  JugadoresRepository,
} from './jugadores.repository.js';
import { JugadoresService } from './jugadores.service.js';

/** Repositorio falso en memoria: lo justo para probar las reglas del servicio. */
class RepositorioEnMemoria {
  jugadores: JugadorConUsuario[] = [];
  /** Inscripciones y usuarios de cada jugador (por id). */
  asociados = new Map<number, AsociadosJugador>();
  private proximoId = 1;

  obtenerPorId(id: number) {
    return Promise.resolve(this.jugadores.find((j) => j.id === id) ?? null);
  }
  async obtenerConInscripciones(id: number) {
    const jugador = await this.obtenerPorId(id);
    return jugador && { ...jugador, inscripciones: [] };
  }
  existeConDni(dni: string, excluirId?: number) {
    return Promise.resolve(
      this.jugadores.some((j) => j.dni === dni && j.id !== excluirId),
    );
  }
  crear(datos: Prisma.JugadorCreateInput) {
    const jugador = { ...datos, id: this.proximoId++, usuarioId: null };
    this.jugadores.push(jugador as JugadorConUsuario);
    return Promise.resolve(jugador);
  }
  modificar(id: number, datos: Prisma.JugadorUpdateInput) {
    const jugador = this.jugadores.find((j) => j.id === id)!;
    // Como Prisma: los campos undefined no se tocan.
    for (const [campo, valor] of Object.entries(datos)) {
      if (valor !== undefined) Object.assign(jugador, { [campo]: valor });
    }
    return Promise.resolve(jugador);
  }
  borrar(id: number) {
    this.jugadores = this.jugadores.filter((j) => j.id !== id);
    return Promise.resolve();
  }
  contarAsociados(id: number) {
    return Promise.resolve(
      this.asociados.get(id) ?? { inscripciones: 0, usuarios: 0 },
    );
  }
}

/** Datos de un jugador válido con el DNI indicado. */
const datosJugador = (dni: string): CrearJugadorDto => ({
  dni,
  nombres: 'Juan',
  apellidos: 'Gómez',
  email: `${dni}@ligahub.test`,
  telefono: '341-555-0001',
  direccion: 'Córdoba 1234',
});

/** Usuario de la sesión con los roles y el jugador indicados. */
const sesion = (
  roles: Rol[],
  jugadorId: number | null = null,
): UsuarioDeSesion => ({
  sub: 99,
  email: 'sesion@ligahub.test',
  roles,
  jugadorId,
});

describe('JugadoresService', () => {
  let repositorio: RepositorioEnMemoria;
  let servicio: JugadoresService;
  const administrador = sesion([Rol.Administrador]);
  /** Ids de dos jugadores ya creados. */
  let idPropio: number;
  let idAjeno: number;

  beforeEach(async () => {
    // Arrange: dos jugadores creados por el administrador.
    repositorio = new RepositorioEnMemoria();
    servicio = new JugadoresService(
      repositorio as unknown as JugadoresRepository,
    );
    idPropio = (await servicio.crear(datosJugador('30000001'))).id;
    idAjeno = (await servicio.crear(datosJugador('30000002'))).id;
  });

  it('rechaza un DNI repetido al crear y al modificar', async () => {
    // Act y Assert
    await expect(servicio.crear(datosJugador('30000001'))).rejects.toThrow(
      ConflictException,
    );
    await expect(
      servicio.modificar(idAjeno, { dni: '30000001' }, administrador),
    ).rejects.toThrow('Ya existe un jugador con el DNI 30000001.');
  });

  it('permite que el administrador modifique el DNI y los nombres', async () => {
    // Act
    const modificado = await servicio.modificar(
      idAjeno,
      { dni: '30000003', nombres: 'Lucas' },
      administrador,
    );

    // Assert
    expect(modificado).toMatchObject({ dni: '30000003', nombres: 'Lucas' });
  });

  it('el jugador ve sus propios datos pero no los de otro', async () => {
    // Arrange
    const jugador = sesion([Rol.Jugador], idPropio);

    // Act
    const propio = await servicio.obtenerConInscripciones(idPropio, jugador);

    // Assert
    expect(propio.id).toBe(idPropio);
    await expect(
      servicio.obtenerConInscripciones(idAjeno, jugador),
    ).rejects.toThrow(ForbiddenException);
    // Un id que no existe también responde 403: no se puede averiguar qué ids existen.
    await expect(
      servicio.obtenerConInscripciones(999, jugador),
    ).rejects.toThrow(ForbiddenException);
  });

  it('el jugador modifica solo sus datos de contacto', async () => {
    // Arrange
    const jugador = sesion([Rol.Jugador], idPropio);

    // Act
    const modificado = await servicio.modificar(
      idPropio,
      { email: 'nuevo@ligahub.test', telefono: '341-555-9999' },
      jugador,
    );

    // Assert
    expect(modificado).toMatchObject({
      email: 'nuevo@ligahub.test',
      telefono: '341-555-9999',
      dni: '30000001',
    });
    await expect(
      servicio.modificar(idPropio, { dni: '30000009' }, jugador),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      servicio.modificar(idAjeno, { email: 'otro@ligahub.test' }, jugador),
    ).rejects.toThrow(ForbiddenException);
  });

  it('un usuario sin rol Jugador ni Administrador no accede a ningún jugador', async () => {
    // Arrange: un asistente no tiene jugador asociado.
    const asistente = sesion([Rol.Asistente]);

    // Act y Assert
    await expect(
      servicio.obtenerConInscripciones(idPropio, asistente),
    ).rejects.toThrow(ForbiddenException);
  });

  it('no borra un jugador con inscripciones o con usuario, y sí uno sin nada', async () => {
    // Arrange
    repositorio.asociados.set(idPropio, { inscripciones: 1, usuarios: 0 });
    repositorio.asociados.set(idAjeno, { inscripciones: 0, usuarios: 1 });
    const libre = await servicio.crear(datosJugador('30000005'));

    // Act y Assert
    await expect(servicio.borrar(idPropio)).rejects.toThrow(/inscripto/);
    await expect(servicio.borrar(idAjeno)).rejects.toThrow(/usuario asociado/);
    await servicio.borrar(libre.id);
    expect(await repositorio.obtenerPorId(libre.id)).toBeNull();
  });
});

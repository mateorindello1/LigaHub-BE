import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { Rol } from '../../common/seguridad/rol.enum.js';
import { ContraseniasService } from './contrasenias.service.js';
import {
  normalizarEmail,
  type DatosUsuario,
  type UsuarioConCredenciales,
} from './usuario.js';
import type { UsuariosRepository } from './usuarios.repository.js';
import type { FotosPerfilService } from './fotos-perfil.service.js';
import { UsuariosService } from './usuarios.service.js';

/** Repositorio falso en memoria: lo justo para probar las reglas del servicio. */
class RepositorioEnMemoria {
  usuarios: UsuarioConCredenciales[] = [];
  /** Ids de los jugadores que existen. */
  jugadores = new Set([10, 20]);
  private proximoId = 1;

  obtenerPorId(id: number) {
    const usuario = this.usuarios.find((u) => u.id === id);
    if (!usuario) return Promise.resolve(null);
    const { contraseniaHash: _hash, ...sinHash } = usuario;
    return Promise.resolve(sinHash);
  }
  obtenerTodos() {
    return Promise.resolve(this.usuarios);
  }
  existeConEmail(email: string, excluirId?: number) {
    return Promise.resolve(
      this.usuarios.some(
        (u) => u.email === normalizarEmail(email) && u.id !== excluirId,
      ),
    );
  }
  jugadorTieneUsuario(jugadorId: number, excluirId?: number) {
    return Promise.resolve(
      this.usuarios.some(
        (u) => u.jugadorId === jugadorId && u.id !== excluirId,
      ),
    );
  }
  existeJugador(jugadorId: number) {
    return Promise.resolve(this.jugadores.has(jugadorId));
  }
  crear(datos: DatosUsuario, contraseniaHash: string) {
    const usuario: UsuarioConCredenciales = {
      id: this.proximoId++,
      email: normalizarEmail(datos.email),
      fotoPerfil: null,
      jugadorId: datos.jugadorId,
      jugador: null,
      roles: datos.roles,
      contraseniaHash,
    };
    this.usuarios.push(usuario);
    return this.obtenerPorId(usuario.id);
  }
  modificar(id: number, datos: DatosUsuario) {
    const usuario = this.usuarios.find((u) => u.id === id)!;
    Object.assign(usuario, { ...datos, email: normalizarEmail(datos.email) });
    return this.obtenerPorId(id);
  }
  cambiarContrasenia(id: number, contraseniaHash: string) {
    this.usuarios.find((u) => u.id === id)!.contraseniaHash = contraseniaHash;
    return Promise.resolve();
  }
  borrar(id: number) {
    this.usuarios = this.usuarios.filter((u) => u.id !== id);
    return Promise.resolve();
  }
}

describe('UsuariosService', () => {
  const contrasenias = new ContraseniasService();
  let repositorio: RepositorioEnMemoria;
  let servicio: UsuariosService;
  /** Id del administrador que hace los pedidos. */
  let idAdmin: number;

  beforeEach(async () => {
    // Arrange: un administrador ya creado.
    repositorio = new RepositorioEnMemoria();
    servicio = new UsuariosService(
      repositorio as unknown as UsuariosRepository,
      contrasenias,
      // Las fotos tienen su propio test: acá solo hace falta que borrar no falle.
      {
        borrarArchivo: () => Promise.resolve(),
      } as unknown as FotosPerfilService,
    );
    const admin = await servicio.crear({
      email: 'admin@ligahub.test',
      contrasenia: 'contraseña-del-admin',
      roles: [Rol.Administrador],
    });
    idAdmin = admin.id;
  });

  describe('crear', () => {
    it('guarda el hash y no la contraseña, y devuelve el usuario sin el hash', async () => {
      // Act
      const usuario = await servicio.crear({
        email: ' Asistente@LigaHub.test ',
        contrasenia: 'una-contraseña-larga',
        roles: [Rol.Asistente],
      });

      // Assert
      const guardado = repositorio.usuarios.find((u) => u.id === usuario.id)!;
      expect(guardado.email).toBe('asistente@ligahub.test');
      expect(guardado.contraseniaHash).toMatch(/^\$argon2id\$/);
      expect(
        await contrasenias.verificar(
          guardado.contraseniaHash,
          'una-contraseña-larga',
        ),
      ).toBe(true);
      expect(usuario).not.toHaveProperty('contraseniaHash');
    });

    it('responde 409 si el email ya existe (sin importar mayúsculas)', async () => {
      // Act y Assert
      await expect(
        servicio.crear({
          email: 'ADMIN@ligahub.test',
          contrasenia: 'una-contraseña-larga',
          roles: [Rol.Asistente],
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it.each([
      [
        'rol Jugador sin jugador',
        [Rol.Jugador],
        null,
        'Un usuario con rol Jugador necesita un jugador asociado.',
      ],
      [
        'jugador sin el rol Jugador',
        [Rol.Asistente],
        10,
        'Solo un usuario con rol Jugador puede tener un jugador asociado.',
      ],
    ])(
      'responde 400 en el campo jugadorId con %s',
      async (_caso, roles, jugadorId, mensaje) => {
        // Act
        const intento = servicio.crear({
          email: 'nuevo@ligahub.test',
          contrasenia: 'una-contraseña-larga',
          roles,
          jugadorId,
        });

        // Assert
        await expect(intento).rejects.toBeInstanceOf(BadRequestException);
        await expect(intento).rejects.toMatchObject({
          response: { detalles: [{ campo: 'jugadorId', mensajes: [mensaje] }] },
        });
      },
    );

    it('responde 404 si el jugador no existe y 409 si ya tiene usuario', async () => {
      // Arrange: el jugador 10 ya tiene usuario.
      await servicio.crear({
        email: 'jugador10@ligahub.test',
        contrasenia: 'una-contraseña-larga',
        roles: [Rol.Jugador],
        jugadorId: 10,
      });
      const datos = {
        email: 'otro@ligahub.test',
        contrasenia: 'una-contraseña-larga',
        roles: [Rol.Jugador],
      };

      // Act y Assert
      await expect(
        servicio.crear({ ...datos, jugadorId: 99 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        servicio.crear({ ...datos, jugadorId: 10 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('modificar', () => {
    it('no deja que el administrador se quite su propio rol de Administrador', async () => {
      // Act y Assert
      await expect(
        servicio.modificar(idAdmin, { roles: [Rol.Asistente] }, idAdmin),
      ).rejects.toThrow('No podés quitarte el rol de Administrador');
    });

    it('sí deja quitarle el rol de Administrador a otro usuario', async () => {
      // Arrange
      const otro = await servicio.crear({
        email: 'otro-admin@ligahub.test',
        contrasenia: 'una-contraseña-larga',
        roles: [Rol.Administrador],
      });

      // Act
      const modificado = await servicio.modificar(
        otro.id,
        { roles: [Rol.Asistente] },
        idAdmin,
      );

      // Assert
      expect(modificado.roles).toEqual([Rol.Asistente]);
    });

    it('al quitar el rol Jugador desasocia el jugador', async () => {
      // Arrange
      const jugador = await servicio.crear({
        email: 'jugador@ligahub.test',
        contrasenia: 'una-contraseña-larga',
        roles: [Rol.Jugador],
        jugadorId: 20,
      });

      // Act
      const modificado = await servicio.modificar(
        jugador.id,
        { roles: [Rol.Asistente] },
        idAdmin,
      );

      // Assert
      expect(modificado.jugadorId).toBeNull();
    });
  });

  it('cambiarContrasenia reemplaza el hash', async () => {
    // Act
    await servicio.cambiarContrasenia(idAdmin, {
      contrasenia: 'la-contraseña-nueva',
    });

    // Assert
    const hash = repositorio.usuarios[0].contraseniaHash;
    expect(await contrasenias.verificar(hash, 'la-contraseña-nueva')).toBe(
      true,
    );
    expect(await contrasenias.verificar(hash, 'contraseña-del-admin')).toBe(
      false,
    );
  });

  it('no deja que un administrador se borre a sí mismo', async () => {
    // Act y Assert
    await expect(servicio.borrar(idAdmin, idAdmin)).rejects.toThrow(
      'No podés borrar tu propio usuario.',
    );
  });
});

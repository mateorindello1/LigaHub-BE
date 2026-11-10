import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Rol } from '../../common/seguridad/rol.enum.js';
import type { UsuarioDeSesion } from '../auth/contenido-token.js';
import { CrearJugadorDto } from './dto/crear-jugador.dto.js';
import {
  CAMPOS_SOLO_ADMINISTRADOR,
  ModificarJugadorDto,
} from './dto/modificar-jugador.dto.js';
import {
  JugadoresRepository,
  type JugadorConInscripciones,
  type JugadorConUsuario,
} from './jugadores.repository.js';

/**
 * Casos de uso de jugadores y sus reglas de negocio.
 *
 * Reglas:
 * - El DNI no se puede repetir.
 * - Permiso por pertenencia: un usuario con rol Jugador ve y modifica solo su propio jugador
 *   (el de Usuario.jugadorId), y de él solo los datos de contacto. El Administrador, cualquiera.
 * - No se borra un jugador con inscripciones o con un usuario asociado.
 */
@Injectable()
export class JugadoresService {
  constructor(private readonly jugadoresRepository: JugadoresRepository) {}

  /**
   * Devuelve los jugadores.
   * @param disponiblesEnTorneo si viene, solo los que todavía se pueden inscribir en ese torneo.
   */
  obtenerTodos(disponiblesEnTorneo?: number): Promise<JugadorConUsuario[]> {
    return this.jugadoresRepository.obtenerTodos(disponiblesEnTorneo);
  }

  /** Devuelve un jugador. Si no existe, responde 404. Lo usan otros módulos (inscripciones). */
  async obtenerPorId(id: number): Promise<JugadorConUsuario> {
    const jugador = await this.jugadoresRepository.obtenerPorId(id);
    if (!jugador) {
      throw new NotFoundException(`No existe el jugador ${id}.`);
    }
    return jugador;
  }

  /**
   * Devuelve un jugador con sus inscripciones, si el usuario de la sesión puede verlo
   * (el Administrador o el propio jugador).
   */
  async obtenerConInscripciones(
    id: number,
    sesion: UsuarioDeSesion,
  ): Promise<JugadorConInscripciones> {
    this.validarPertenencia(id, sesion);

    const jugador = await this.jugadoresRepository.obtenerConInscripciones(id);
    if (!jugador) {
      throw new NotFoundException(`No existe el jugador ${id}.`);
    }
    return jugador;
  }

  /** Crea un jugador. El DNI no puede repetirse. */
  async crear(dto: CrearJugadorDto): Promise<JugadorConUsuario> {
    await this.validarDniDisponible(dto.dni);
    return this.jugadoresRepository.crear({
      dni: dto.dni,
      nombres: dto.nombres,
      apellidos: dto.apellidos,
      email: dto.email,
      telefono: dto.telefono,
      direccion: dto.direccion,
    });
  }

  /**
   * Modifica un jugador. El Administrador modifica cualquier dato; el propio jugador, solo los
   * de contacto.
   */
  async modificar(
    id: number,
    dto: ModificarJugadorDto,
    sesion: UsuarioDeSesion,
  ): Promise<JugadorConUsuario> {
    this.validarPertenencia(id, sesion);

    if (!sesion.roles.includes(Rol.Administrador)) {
      const prohibidos = CAMPOS_SOLO_ADMINISTRADOR.filter(
        (campo) => dto[campo] !== undefined,
      );
      if (prohibidos.length > 0) {
        throw new ForbiddenException(
          'El DNI, los nombres y los apellidos solo los puede cambiar un administrador.',
        );
      }
    }

    await this.obtenerPorId(id);
    if (dto.dni !== undefined) {
      await this.validarDniDisponible(dto.dni, id);
    }

    // Los campos que no vinieron quedan undefined y Prisma no los toca.
    return this.jugadoresRepository.modificar(id, {
      dni: dto.dni,
      nombres: dto.nombres,
      apellidos: dto.apellidos,
      email: dto.email,
      telefono: dto.telefono,
      direccion: dto.direccion,
    });
  }

  /** Borra un jugador. No se permite si tiene inscripciones o un usuario asociado. */
  async borrar(id: number): Promise<void> {
    await this.obtenerPorId(id);

    const asociados = await this.jugadoresRepository.contarAsociados(id);
    if (asociados.inscripciones > 0) {
      throw new ConflictException(
        'No se puede borrar un jugador inscripto en un equipo. Primero hay que dar de baja sus inscripciones.',
      );
    }
    if (asociados.usuarios > 0) {
      throw new ConflictException(
        'No se puede borrar un jugador con un usuario asociado. Primero hay que borrar el usuario o quitarle el jugador.',
      );
    }

    await this.jugadoresRepository.borrar(id);
  }

  /**
   * Permiso por pertenencia: el Administrador accede a cualquier jugador; los demás, solo al
   * propio. Se controla antes de buscar el jugador, así un usuario ajeno recibe siempre 403 y no
   * puede averiguar qué ids existen.
   */
  private validarPertenencia(id: number, sesion: UsuarioDeSesion): void {
    if (sesion.roles.includes(Rol.Administrador)) return;
    if (sesion.jugadorId !== id) {
      throw new ForbiddenException(
        'Solo podés ver y modificar tus propios datos.',
      );
    }
  }

  /**
   * Verifica que no haya otro jugador con el mismo DNI.
   * La clave única de la base también lo impide, pero así el mensaje es más claro.
   */
  private async validarDniDisponible(
    dni: string,
    excluirId?: number,
  ): Promise<void> {
    if (await this.jugadoresRepository.existeConDni(dni, excluirId)) {
      throw new ConflictException(`Ya existe un jugador con el DNI ${dni}.`);
    }
  }
}

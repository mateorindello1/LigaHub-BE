import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Equipo } from '../../generated/prisma/client.js';
import { CrearEquipoDto } from './dto/crear-equipo.dto.js';
import { ModificarEquipoDto } from './dto/modificar-equipo.dto.js';
import { EquiposRepository } from './equipos.repository.js';

/** Casos de uso de equipos y sus reglas de negocio. */
@Injectable()
export class EquiposService {
  constructor(private readonly equiposRepository: EquiposRepository) {}

  /** Devuelve todos los equipos. */
  obtenerTodos(): Promise<Equipo[]> {
    return this.equiposRepository.obtenerTodos();
  }

  /** Devuelve un equipo. Si no existe, responde 404. */
  async obtenerPorId(id: number): Promise<Equipo> {
    const equipo = await this.equiposRepository.obtenerPorId(id);
    if (!equipo) {
      throw new NotFoundException(`No existe el equipo ${id}.`);
    }
    return equipo;
  }

  /** Crea un equipo. El nombre no puede repetirse. */
  async crear(dto: CrearEquipoDto): Promise<Equipo> {
    await this.validarNombreDisponible(dto.nombre);

    return this.equiposRepository.crear({
      nombre: dto.nombre,
      escudoURL: dto.escudoURL ?? null,
    });
  }

  /** Modifica el nombre o el escudo de un equipo existente. */
  async modificar(id: number, dto: ModificarEquipoDto): Promise<Equipo> {
    await this.obtenerPorId(id);

    if (dto.nombre !== undefined) {
      await this.validarNombreDisponible(dto.nombre, id);
    }

    return this.equiposRepository.modificar(id, {
      nombre: dto.nombre,
      escudoURL: dto.escudoURL,
    });
  }

  /** Borra un equipo. No se permite si tiene inscripciones o partidos. */
  async borrar(id: number): Promise<void> {
    await this.obtenerPorId(id);

    if (await this.equiposRepository.tieneDatosAsociados(id)) {
      throw new ConflictException(
        'No se puede borrar un equipo con inscripciones o partidos.',
      );
    }

    await this.equiposRepository.borrar(id);
  }

  /**
   * Verifica que no haya otro equipo con el mismo nombre.
   * La clave única de la base también lo impide, pero así el mensaje es más claro.
   */
  private async validarNombreDisponible(
    nombre: string,
    excluirId?: number,
  ): Promise<void> {
    if (await this.equiposRepository.existeConNombre(nombre, excluirId)) {
      throw new ConflictException(`Ya existe un equipo llamado "${nombre}".`);
    }
  }
}

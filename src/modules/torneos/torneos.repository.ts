import { Injectable } from '@nestjs/common';
import type { Prisma, Torneo } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * Acceso a datos de torneos. Es la única capa que usa Prisma directamente:
 * el servicio no conoce cómo se guardan los datos.
 */
@Injectable()
export class TorneosRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Devuelve todos los torneos, del año más reciente al más antiguo y por nombre. */
  obtenerTodos(): Promise<Torneo[]> {
    return this.prisma.torneo.findMany({
      orderBy: [{ anio: 'desc' }, { nombre: 'asc' }],
    });
  }

  /** Devuelve el torneo con ese id, o null si no existe. */
  obtenerPorId(id: number): Promise<Torneo | null> {
    return this.prisma.torneo.findUnique({ where: { id } });
  }

  /** Inserta un torneo y devuelve el registro creado, con su id. */
  crear(datos: Prisma.TorneoCreateInput): Promise<Torneo> {
    return this.prisma.torneo.create({ data: datos });
  }

  /** Actualiza los campos recibidos y devuelve el torneo modificado. */
  modificar(id: number, datos: Prisma.TorneoUpdateInput): Promise<Torneo> {
    return this.prisma.torneo.update({ where: { id }, data: datos });
  }

  /** Elimina el torneo. */
  async borrar(id: number): Promise<void> {
    await this.prisma.torneo.delete({ where: { id } });
  }

  /** Indica si el torneo tiene equipos inscriptos o fechas de fixture asociadas. */
  async tieneDatosAsociados(id: number): Promise<boolean> {
    const [inscripciones, fechas] = await Promise.all([
      this.prisma.inscripcionEquipo.count({ where: { torneoId: id } }),
      this.prisma.fechaFixture.count({ where: { torneoId: id } }),
    ]);
    return inscripciones > 0 || fechas > 0;
  }
}

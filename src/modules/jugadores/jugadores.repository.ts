import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

/** Jugador para elegir en una lista (por ejemplo, al asociarlo a un usuario). */
export interface JugadorResumen {
  id: number;
  dni: string;
  nombres: string;
  apellidos: string;
  /** Usuario asociado, o null si no tiene. */
  usuarioId: number | null;
}

/** Acceso a datos de jugadores. El CRUD completo se agrega en AD-2. */
@Injectable()
export class JugadoresRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Devuelve todos los jugadores, por apellido y nombre, con su usuario asociado si lo tienen. */
  async obtenerResumen(): Promise<JugadorResumen[]> {
    const jugadores = await this.prisma.jugador.findMany({
      select: {
        id: true,
        dni: true,
        nombres: true,
        apellidos: true,
        usuarios: { select: { id: true }, take: 1 },
      },
      orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }],
    });
    return jugadores.map(({ usuarios, ...jugador }) => ({
      ...jugador,
      usuarioId: usuarios[0]?.id ?? null,
    }));
  }
}

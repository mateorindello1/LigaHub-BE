import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

/** Token de refresco guardado (solo su hash, nunca el token). */
export interface TokenRefrescoGuardado {
  id: string;
  usuarioId: number;
  familiaId: string;
  fechaHoraVencimiento: Date;
  /** Cuándo se usó o se revocó. Null: todavía sirve. */
  fechaHoraRevocacion: Date | null;
}

/** Datos para guardar un token de refresco nuevo. */
export interface NuevoTokenRefresco {
  usuarioId: number;
  familiaId: string;
  tokenHash: string;
  fechaHoraVencimiento: Date;
}

/** Acceso a datos de los tokens de refresco (tabla TokenRefresco). */
@Injectable()
export class TokensRefrescoRepository {
  constructor(private readonly prisma: PrismaService) {}

  // #region Consultas
  /** Busca un token por su hash. */
  buscarPorHash(tokenHash: string): Promise<TokenRefrescoGuardado | null> {
    return this.prisma.tokenRefresco.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        usuarioId: true,
        familiaId: true,
        fechaHoraVencimiento: true,
        fechaHoraRevocacion: true,
      },
    });
  }
  // #endregion

  // #region Escrituras
  /** Guarda el token de una sesión nueva (login). */
  async crear(token: NuevoTokenRefresco): Promise<void> {
    await this.prisma.tokenRefresco.create({ data: token });
  }

  /**
   * Reemplaza un token por el siguiente de la misma sesión (rotación), en una transacción.
   * El anterior se marca como usado solo si todavía estaba vigente: si dos pedidos usan el mismo
   * token a la vez, uno solo lo consigue.
   * @returns false si el token anterior ya estaba usado o revocado (no se guarda el nuevo).
   */
  rotar(idAnterior: string, nuevo: NuevoTokenRefresco): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.tokenRefresco.updateMany({
        where: { id: idAnterior, fechaHoraRevocacion: null },
        data: { fechaHoraRevocacion: new Date() },
      });
      if (count === 0) return false;
      await tx.tokenRefresco.create({ data: nuevo });
      return true;
    });
  }

  /** Revoca todos los tokens vigentes de una sesión (cierre de sesión o token robado). */
  async revocarFamilia(familiaId: string): Promise<void> {
    await this.prisma.tokenRefresco.updateMany({
      where: { familiaId, fechaHoraRevocacion: null },
      data: { fechaHoraRevocacion: new Date() },
    });
  }

  /**
   * Borra los tokens vencidos de un usuario. Se llama en cada login, para que la tabla no crezca
   * sin límite. Los usados que todavía no vencieron se conservan: sirven para detectar si alguien
   * reutiliza un token viejo.
   */
  async borrarVencidos(usuarioId: number): Promise<void> {
    await this.prisma.tokenRefresco.deleteMany({
      where: { usuarioId, fechaHoraVencimiento: { lte: new Date() } },
    });
  }
  // #endregion
}

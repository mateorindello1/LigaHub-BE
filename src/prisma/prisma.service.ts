import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaMssql } from '@prisma/adapter-mssql';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * Cliente de Prisma registrado como servicio de Nest.
 * Equivale al DbContext de EF Core: se inyecta en los repositorios para acceder a la base.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // El adaptador de SQL Server recibe la misma cadena de conexión que usan las migraciones.
    const cadenaConexion = process.env.DATABASE_URL;
    if (!cadenaConexion) {
      throw new Error('Falta la variable de entorno DATABASE_URL.');
    }
    super({ adapter: new PrismaMssql(cadenaConexion) });
  }

  /** Abre la conexión al iniciar la aplicación, para que un error de conexión se vea en el arranque. */
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  /** Cierra la conexión al apagar la aplicación. */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

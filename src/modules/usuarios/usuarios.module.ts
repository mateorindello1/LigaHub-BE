import { Module } from '@nestjs/common';
import { ContraseniasService } from './contrasenias.service.js';
import { UsuariosRepository } from './usuarios.repository.js';

/**
 * Módulo de usuarios. Por ahora ofrece el acceso a datos y el hash de contraseñas, que usa la
 * autenticación (S-2). Los endpoints de gestión de usuarios llegan en S-6.
 */
@Module({
  providers: [UsuariosRepository, ContraseniasService],
  exports: [UsuariosRepository, ContraseniasService],
})
export class UsuariosModule {}

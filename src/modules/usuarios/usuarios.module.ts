import { Module } from '@nestjs/common';
import { ContraseniasService } from './contrasenias.service.js';
import { UsuariosController } from './usuarios.controller.js';
import { UsuariosRepository } from './usuarios.repository.js';
import { UsuariosService } from './usuarios.service.js';

/**
 * Módulo de usuarios: gestión de usuarios y roles (solo Administrador). Exporta el repositorio
 * y el servicio de contraseñas, que usa la autenticación.
 */
@Module({
  controllers: [UsuariosController],
  providers: [UsuariosService, UsuariosRepository, ContraseniasService],
  exports: [UsuariosRepository, ContraseniasService],
})
export class UsuariosModule {}

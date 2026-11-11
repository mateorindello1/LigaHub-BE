import { Module } from '@nestjs/common';
import { AlmacenamientoModule } from '../almacenamiento/almacenamiento.module.js';
import { ContraseniasService } from './contrasenias.service.js';
import { DescargadorImagenes } from './descargador-imagenes.js';
import { FotosPerfilController } from './fotos-perfil.controller.js';
import { FotosPerfilService } from './fotos-perfil.service.js';
import { UsuariosController } from './usuarios.controller.js';
import { UsuariosRepository } from './usuarios.repository.js';
import { UsuariosService } from './usuarios.service.js';

/**
 * Módulo de usuarios: gestión de usuarios y roles (solo Administrador) y fotos de perfil (cada
 * usuario la suya). Exporta el repositorio y el servicio de contraseñas, que usa la autenticación.
 */
@Module({
  imports: [AlmacenamientoModule],
  controllers: [UsuariosController, FotosPerfilController],
  providers: [
    UsuariosService,
    UsuariosRepository,
    ContraseniasService,
    FotosPerfilService,
    DescargadorImagenes,
  ],
  exports: [UsuariosRepository, ContraseniasService],
})
export class UsuariosModule {}

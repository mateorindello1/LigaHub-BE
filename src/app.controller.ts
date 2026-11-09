import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { AppService } from './app.service.js';
import { Publico } from './common/seguridad/publico.decorator.js';

// Controller de ejemplo de Nest: se oculta de la documentación.
@ApiExcludeController()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Público: con los guards globales, sin este decorador pediría iniciar sesión.
  @Publico()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}

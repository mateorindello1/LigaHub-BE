import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { TorneosModule } from './modules/torneos/torneos.module.js';

@Module({
  imports: [PrismaModule, TorneosModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

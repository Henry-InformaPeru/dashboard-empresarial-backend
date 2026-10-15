import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/authModule';
import { EmpresasModule } from '../empresas/empresasModule';

import { UsuarioOrmEntity } from '../auth/infrastructure/persistence/entities/usuarioOrm.entity';

import { USUARIO_ADMIN_REPOSITORY } from './application/ports/output/usuarioAdminRepository.port';
import { UsuarioAdminRepository } from './infrastructure/persistence/repositories/usuarioAdminRepository';

import { CrearUsuarioUseCase } from './application/useCase/crearUsuarioUseCase';
import { CrearUsuarioController } from './infrastructure/http/controllers/crearUsuarioController';

import { RolesGuard } from '../../shared/infrastructure/guards/rolesGuard';

@Module({
  imports: [
    TypeOrmModule.forFeature([UsuarioOrmEntity]),
    AuthModule,
    EmpresasModule,
  ],
  controllers: [CrearUsuarioController],
  providers: [
    CrearUsuarioUseCase,
    RolesGuard,
    {
      provide: USUARIO_ADMIN_REPOSITORY,
      useClass: UsuarioAdminRepository,
    },
  ],
})
export class UsuariosModule {}

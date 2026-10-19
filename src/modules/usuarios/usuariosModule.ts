import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/authModule';
import { EmpresasModule } from '../empresas/empresasModule';

import { UsuarioOrmEntity } from '../auth/infrastructure/persistence/entities/usuarioOrm.entity';

import { USUARIO_ADMIN_REPOSITORY } from './application/ports/output/usuarioAdminRepository.port';
import { UsuarioAdminRepository } from './infrastructure/persistence/repositories/usuarioAdminRepository';

import { CrearUsuarioUseCase } from './application/useCase/crearUsuarioUseCase';
import { ListarUsuariosUseCase } from './application/useCase/listarUsuariosUseCase';
import { ObtenerDetalleUsuarioUseCase } from './application/useCase/obtenerDetalleUsuarioUseCase';
import { CambiarEstadoUsuarioUseCase } from './application/useCase/cambiarEstadoUsuarioUseCase';
import { CambiarPasswordUsuarioUseCase } from './application/useCase/cambiarPasswordUsuarioUseCase';
import { EliminarUsuarioUseCase } from './application/useCase/eliminarUsuarioUseCase';

import { CrearUsuarioController } from './infrastructure/http/controllers/crearUsuarioController';
import { ListarUsuariosController } from './infrastructure/http/controllers/listarUsuariosController';
import { ObtenerDetalleUsuarioController } from './infrastructure/http/controllers/obtenerDetalleUsuarioController';
import { CambiarEstadoUsuarioController } from './infrastructure/http/controllers/cambiarEstadoUsuarioController';
import { CambiarPasswordUsuarioController } from './infrastructure/http/controllers/cambiarPasswordUsuarioController';
import { EliminarUsuarioController } from './infrastructure/http/controllers/eliminarUsuarioController';

import { RolesGuard } from '../../shared/infrastructure/guards/rolesGuard';

@Module({
  imports: [
    TypeOrmModule.forFeature([UsuarioOrmEntity]),
    AuthModule,
    EmpresasModule,
  ],
  controllers: [
    CrearUsuarioController,
    ListarUsuariosController,
    ObtenerDetalleUsuarioController,
    CambiarEstadoUsuarioController,
    CambiarPasswordUsuarioController,
    EliminarUsuarioController,
  ],
  providers: [
    CrearUsuarioUseCase,
    ListarUsuariosUseCase,
    ObtenerDetalleUsuarioUseCase,
    CambiarEstadoUsuarioUseCase,
    CambiarPasswordUsuarioUseCase,
    EliminarUsuarioUseCase,
    RolesGuard,
    {
      provide: USUARIO_ADMIN_REPOSITORY,
      useClass: UsuarioAdminRepository,
    },
  ],
})
export class UsuariosModule {}

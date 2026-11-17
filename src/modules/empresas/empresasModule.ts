import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/authModule';

import { EmpresaOrmEntity } from './infrastructure/persistence/entities/empresaOrm.entity';
import { EmpresaRepository } from './infrastructure/persistence/repositories/empresaRepository';

import { EMPRESA_REPOSITORY } from './application/ports/output/empresaRepository.port';

import { ListarEmpresasUseCase } from './application/useCase/listarEmpresasUseCase';
import { ObtenerEmpresaUseCase } from './application/useCase/obtenerEmpresaUseCase';
import { CrearEmpresaUseCase } from './application/useCase/CrearEmpresaUseCase';
import { ActualizarEmpresaUseCase } from './application/useCase/ActualizarEmpresaUseCase';
import { EliminarEmpresaUseCase } from './application/useCase/EliminarEmpresaUseCase';

import { ListarEmpresasController } from './infrastructure/http/controllers/listarEmpresasController';
import { ObtenerEmpresaController } from './infrastructure/http/controllers/obtenerEmpresaController';
import { CrearEmpresaController } from './infrastructure/http/controllers/CrearEmpresaController';
import { ActualizarEmpresaController } from './infrastructure/http/controllers/ActualizarEmpresaController';
import { EliminarEmpresaController } from './infrastructure/http/controllers/EliminarEmpresaController';

import { RolesGuard } from '../../shared/infrastructure/guards/rolesGuard';
import { EmpresaGuard } from '../../shared/infrastructure/guards/empresaGuard';
import { DashboardsModule } from '../dashboards/dashboardsModule';
import { AsignacionesModule } from '../asignaciones/asignacionesModule';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmpresaOrmEntity]),
    AuthModule,
    forwardRef(() => DashboardsModule),
    forwardRef(() => AsignacionesModule),
  ],
  controllers: [
    ListarEmpresasController,
    ObtenerEmpresaController,
    CrearEmpresaController,
    ActualizarEmpresaController,
    EliminarEmpresaController,
  ],
  providers: [
    ListarEmpresasUseCase,
    ObtenerEmpresaUseCase,
    CrearEmpresaUseCase,
    ActualizarEmpresaUseCase,
    EliminarEmpresaUseCase,
    RolesGuard,
    EmpresaGuard,
    {
      provide: EMPRESA_REPOSITORY,
      useClass: EmpresaRepository,
    },
  ],
  exports: [EMPRESA_REPOSITORY],
})
export class EmpresasModule {}

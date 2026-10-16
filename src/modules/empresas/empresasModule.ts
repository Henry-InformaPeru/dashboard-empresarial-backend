import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/authModule';

import { EmpresaOrmEntity } from './infrastructure/persistence/entities/empresaOrm.entity';
import { EmpresaRepository } from './infrastructure/persistence/repositories/empresaRepository';

import { EMPRESA_REPOSITORY } from './application/ports/output/empresaRepository.port';

import { ListarEmpresasUseCase } from './application/useCase/listarEmpresasUseCase';
import { ObtenerEmpresaUseCase } from './application/useCase/obtenerEmpresaUseCase';

import { ListarEmpresasController } from './infrastructure/http/controllers/listarEmpresasController';
import { ObtenerEmpresaController } from './infrastructure/http/controllers/obtenerEmpresaController';

import { RolesGuard } from '../../shared/infrastructure/guards/rolesGuard';
import { EmpresaGuard } from '../../shared/infrastructure/guards/empresaGuard';
import { CrearEmpresaUseCase } from './application/useCase/CrearEmpresaUseCase';
import { CrearEmpresaController } from './infrastructure/http/controllers/CrearEmpresaController';
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
  ],
  providers: [
    ListarEmpresasUseCase,
    ObtenerEmpresaUseCase,
    CrearEmpresaUseCase,
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

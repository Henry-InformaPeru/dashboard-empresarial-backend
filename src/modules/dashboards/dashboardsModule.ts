import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/authModule';
import { EmpresasModule } from '../empresas/empresasModule';

import { DashboardOrmEntity } from './infrastructure/persistence/entities/dashboardOrm.entity';
import { EmpresaDashboardOrmEntity } from './infrastructure/persistence/entities/empresaDashboardOrm.entity';

import { DashboardRepository } from './infrastructure/persistence/repositories/dashboardRepository';
import { DASHBOARD_REPOSITORY } from './application/ports/output/dashboardRepository.port';

import { ListarMisDashboardsUseCase } from './application/useCase/listarMisDashboardsUseCase';
import { ListarDashboardsUseCase } from './application/useCase/listarDashboardsUseCase';
import { ObtenerDashboardUseCase } from './application/useCase/obtenerDashboardUseCase';
import { ListarDashboardsEmpresaUseCase } from './application/useCase/listarDashboardsEmpresaUseCase';

import { ListarMisDashboardsController } from './infrastructure/http/controllers/listarMisDashboardsController';
import { ListarDashboardsController } from './infrastructure/http/controllers/listarDashboardsController';
import { ObtenerDashboardController } from './infrastructure/http/controllers/obtenerDashboardController';
import { ListarDashboardsEmpresaController } from './infrastructure/http/controllers/listarDashboardsEmpresaController';

import { RolesGuard } from '../../shared/infrastructure/guards/rolesGuard';

@Module({
  imports: [
    TypeOrmModule.forFeature([DashboardOrmEntity, EmpresaDashboardOrmEntity]),
    AuthModule,
    forwardRef(() => EmpresasModule),
  ],
  controllers: [
    ListarMisDashboardsController,
    ListarDashboardsController,
    ObtenerDashboardController,
    ListarDashboardsEmpresaController,
  ],
  providers: [
    ListarMisDashboardsUseCase,
    ListarDashboardsUseCase,
    ObtenerDashboardUseCase,
    ListarDashboardsEmpresaUseCase,
    RolesGuard,
    {
      provide: DASHBOARD_REPOSITORY,
      useClass: DashboardRepository,
    },
  ],
  exports: [DASHBOARD_REPOSITORY],
})
export class DashboardsModule {}

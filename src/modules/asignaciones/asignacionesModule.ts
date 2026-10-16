import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/authModule';
import { EmpresasModule } from '../empresas/empresasModule';
import { DashboardsModule } from '../dashboards/dashboardsModule';

import { EmpresaDashboardOrmEntity } from '../dashboards/infrastructure/persistence/entities/empresaDashboardOrm.entity';

import { ASIGNACION_REPOSITORY } from './application/ports/output/asignacionRepository.port';

import { AsignacionRepository } from './infrastructure/persistence/repositories/asignacionRepository';

import { AsignarDashboardUseCase } from './application/useCase/asignarDashboardUseCase';
import { ActualizarEstadoAsignacionUseCase } from './application/useCase/actualizarEstadoAsignacionUseCase';

import { AsignarDashboardController } from './infrastructure/http/controllers/asignarDashboardController';
import { ActualizarEstadoAsignacionController } from './infrastructure/http/controllers/actualizarEstadoAsignacionController';

import { RolesGuard } from '../../shared/infrastructure/guards/rolesGuard';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmpresaDashboardOrmEntity]),
    AuthModule,
    forwardRef(() => EmpresasModule),
    forwardRef(() => DashboardsModule),
  ],
  controllers: [
    AsignarDashboardController,
    ActualizarEstadoAsignacionController,
  ],
  providers: [
    AsignarDashboardUseCase,
    ActualizarEstadoAsignacionUseCase,
    RolesGuard,
    {
      provide: ASIGNACION_REPOSITORY,
      useClass: AsignacionRepository,
    },
  ],
  exports: [ASIGNACION_REPOSITORY],
})
export class AsignacionesModule {}

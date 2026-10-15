import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/authModule';

import { DashboardOrmEntity } from '../dashboards/infrastructure/persistence/entities/dashboardOrm.entity';
import { EmpresaDashboardOrmEntity } from '../dashboards/infrastructure/persistence/entities/empresaDashboardOrm.entity';

import { DashboardPeriodoOrmEntity } from './infrastructure/persistence/entities/dashboardPeriodoOrm.entity';

import { PERIODO_REPOSITORY } from './application/ports/output/periodoRepository.port';

import { PeriodoRepository } from './infrastructure/persistence/repositories/periodoRepository';

import { ListarPeriodosUseCase } from './application/useCase/listarPeriodosUseCase';
import { ObtenerEnlacesPeriodoUseCase } from './application/useCase/obtenerEnlacesPeriodoUseCase';

import { ListarPeriodosController } from './infrastructure/http/controllers/listarPeriodosController';
import { ObtenerEnlacesPeriodoController } from './infrastructure/http/controllers/obtenerEnlacesPeriodoController';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      DashboardPeriodoOrmEntity,
      DashboardOrmEntity,
      EmpresaDashboardOrmEntity,
    ]),
  ],

  controllers: [ListarPeriodosController, ObtenerEnlacesPeriodoController],

  providers: [
    ListarPeriodosUseCase,
    ObtenerEnlacesPeriodoUseCase,
    {
      provide: PERIODO_REPOSITORY,
      useClass: PeriodoRepository,
    },
  ],
})
export class PeriodosModule {}

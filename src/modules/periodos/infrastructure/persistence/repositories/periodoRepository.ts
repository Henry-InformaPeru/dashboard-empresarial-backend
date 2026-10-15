import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { DashboardPeriodo } from '../../../domain/entities/dashboardPeriodo.entity';
import type { PeriodoRepositoryPort } from '../../../application/ports/output/periodoRepository.port';

import { DashboardPeriodoOrmEntity } from '../entities/dashboardPeriodoOrm.entity';
import { PeriodoMapper } from '../mappers/periodoMapper';

import { DashboardOrmEntity } from '../../../../dashboards/infrastructure/persistence/entities/dashboardOrm.entity';
import { EmpresaDashboardOrmEntity } from '../../../../dashboards/infrastructure/persistence/entities/empresaDashboardOrm.entity';

@Injectable()
export class PeriodoRepository implements PeriodoRepositoryPort {
  constructor(
    @InjectRepository(DashboardPeriodoOrmEntity)
    private readonly periodoRepository: Repository<DashboardPeriodoOrmEntity>,

    @InjectRepository(DashboardOrmEntity)
    private readonly dashboardRepository: Repository<DashboardOrmEntity>,
  ) {}

  async listarPorDashboard(dashboardId: number): Promise<DashboardPeriodo[]> {
    const periodos = await this.periodoRepository.find({
      where: { dashboardId },
      order: { periodo: 'DESC' },
    });

    return periodos.map((periodo) => PeriodoMapper.toDomain(periodo));
  }

  async buscarPorDashboardYPeriodo(
    dashboardId: number,
    periodo: string,
  ): Promise<DashboardPeriodo | null> {
    const registro = await this.periodoRepository.findOne({
      where: { dashboardId, periodo },
    });

    return registro ? PeriodoMapper.toDomain(registro) : null;
  }

  async tieneAcceso(dashboardId: number, empresaId: number): Promise<boolean> {
    const cantidad = await this.dashboardRepository
      .createQueryBuilder('dashboard')
      .innerJoin(
        EmpresaDashboardOrmEntity,
        'asignacion',
        'asignacion.dashboardId = dashboard.id',
      )
      .where('dashboard.id = :dashboardId', { dashboardId })
      .andWhere('dashboard.estado = :estadoDashboard', {
        estadoDashboard: 'ACTIVO',
      })
      .andWhere('asignacion.empresaId = :empresaId', { empresaId })
      .andWhere('asignacion.estado = :estadoAsignacion', {
        estadoAsignacion: 'ACTIVO',
      })
      .getCount();

    return cantidad > 0;
  }
}

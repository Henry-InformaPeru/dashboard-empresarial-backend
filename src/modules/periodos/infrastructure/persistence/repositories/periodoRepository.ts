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
    const [periodos, vinculoReporte] = await Promise.all([
      this.periodoRepository.find({
        where: { dashboardId },
        order: { periodo: 'DESC' },
      }),
      this.buscarVinculoPowerbiDelReporte(dashboardId),
    ]);

    return periodos.map((periodo) =>
      PeriodoMapper.toDomain(periodo, vinculoReporte),
    );
  }

  async buscarPorDashboardYPeriodo(
    dashboardId: number,
    periodo: string,
  ): Promise<DashboardPeriodo | null> {
    const registro = await this.periodoRepository.findOne({
      where: { dashboardId, periodo },
    });

    if (!registro) {
      return null;
    }

    return PeriodoMapper.toDomain(
      registro,
      await this.buscarVinculoPowerbiDelReporte(dashboardId),
    );
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

  async crear(
    dashboardId: number,
    periodo: string,
    urlPowerbi: string | null,
    urlMega: string | null,
  ): Promise<DashboardPeriodo> {
    const nuevoRegistro = this.periodoRepository.create({
      dashboardId,
      periodo,
      urlPowerbi: urlPowerbi ?? null,
      urlMega: urlMega ?? null,
      fechaCreacion: new Date(),
    });

    const guardado = await this.periodoRepository.save(nuevoRegistro);

    return PeriodoMapper.toDomain(
      guardado,
      await this.buscarVinculoPowerbiDelReporte(dashboardId),
    );
  }

  async cambiarVinculoPowerbiDelReporte(
    dashboardId: number,
    urlPowerbi: string,
  ): Promise<number> {
    return this.periodoRepository.manager.transaction(async (manager) => {
      await manager.update(
        DashboardOrmEntity,
        { id: dashboardId },
        { urlPowerbi },
      );

      // Los periodos dejan de llevar un vínculo propio: todos pasan a usar el del reporte
      const resultado = await manager.update(
        DashboardPeriodoOrmEntity,
        { dashboardId },
        { urlPowerbi: null },
      );

      return resultado.affected ?? 0;
    });
  }

  private async buscarVinculoPowerbiDelReporte(
    dashboardId: number,
  ): Promise<string | null> {
    const dashboard = await this.dashboardRepository.findOne({
      where: { id: dashboardId },
      select: { id: true, urlPowerbi: true },
    });

    return dashboard?.urlPowerbi ?? null;
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { Dashboard } from '../../../domain/entities/dashboard.entity';
import type { DashboardRepositoryPort } from '../../../application/ports/output/dashboardRepository.port';

import { DashboardOrmEntity } from '../entities/dashboardOrm.entity';
import { EmpresaDashboardOrmEntity } from '../entities/empresaDashboardOrm.entity';
import { DashboardMapper } from '../mappers/dashboardMapper';
import type { DashboardAsignadoEmpresaDto } from '../../../application/dto/dashboardAsignadoEmpresa.dto';

@Injectable()
export class DashboardRepository implements DashboardRepositoryPort {
  constructor(
    @InjectRepository(DashboardOrmEntity)
    private readonly repository: Repository<DashboardOrmEntity>,
  ) {}

  async listarPorEmpresa(empresaId: number): Promise<Dashboard[]> {
    const dashboards = await this.repository
      .createQueryBuilder('dashboard')
      .innerJoin(
        EmpresaDashboardOrmEntity,
        'asignacion',
        'asignacion.dashboardId = dashboard.id',
      )
      .where('asignacion.empresaId = :empresaId', { empresaId })
      .andWhere('asignacion.estado = :estadoAsignacion', {
        estadoAsignacion: 'ACTIVO',
      })
      .andWhere('dashboard.estado = :estadoDashboard', {
        estadoDashboard: 'ACTIVO',
      })
      .distinct(true)
      .orderBy('dashboard.nombre', 'ASC')
      .getMany();

    return dashboards.map((dashboard) => DashboardMapper.toDomain(dashboard));
  }

  async listarTodos(): Promise<Dashboard[]> {
    const dashboards = await this.repository.find({
      order: {
        nombre: 'ASC',
      },
    });

    return dashboards.map((dashboard) => DashboardMapper.toDomain(dashboard));
  }

  async buscarPorId(id: number): Promise<Dashboard | null> {
    const dashboard = await this.repository.findOne({
      where: { id },
    });

    return dashboard ? DashboardMapper.toDomain(dashboard) : null;
  }

  async listarAsignadosPorEmpresa(
    empresaId: number,
  ): Promise<DashboardAsignadoEmpresaDto[]> {
    const registros = await this.repository
      .createQueryBuilder('dashboard')
      .innerJoin(
        EmpresaDashboardOrmEntity,
        'asignacion',
        'asignacion.dashboardId = dashboard.id',
      )
      .select('dashboard.id', 'dashboard_id')
      .addSelect('dashboard.codigo', 'dashboard_codigo')
      .addSelect('dashboard.nombre', 'dashboard_nombre')
      .addSelect('dashboard.descripcion', 'dashboard_descripcion')
      .addSelect('dashboard.estado', 'dashboard_estado')
      .addSelect('asignacion.id', 'asignacion_id')
      .addSelect('asignacion.estado', 'asignacion_estado')
      .addSelect('asignacion.fechaAsignacion', 'asignacion_fechaAsignacion')
      .addSelect(
        'asignacion.fechaDesactivacion',
        'asignacion_fechaDesactivacion',
      )
      .addSelect('dashboard.fechaCreacion', 'dashboard_fechaCreacion')
      .where('asignacion.empresaId = :empresaId', { empresaId })
      .orderBy('dashboard.nombre', 'ASC')
      .getRawMany<{
        dashboard_id: number;
        dashboard_codigo: string;
        dashboard_nombre: string;
        dashboard_descripcion: string | null;
        dashboard_estado: string;
        asignacion_id: number;
        asignacion_estado: string;
        asignacion_fechaAsignacion: Date;
        asignacion_fechaDesactivacion: Date | null;
        dashboard_fechaCreacion: Date;
      }>();

    return registros.map((registro) => {
      if (
        registro.asignacion_estado !== 'ACTIVO' &&
        registro.asignacion_estado !== 'INACTIVO'
      ) {
        throw new Error('Estado de asignación no reconocido');
      }

      return {
        dashboard: {
          id: registro.dashboard_id,
          codigo: registro.dashboard_codigo,
          nombre: registro.dashboard_nombre,
          descripcion: registro.dashboard_descripcion,
          estado: registro.dashboard_estado,
          fechaCreacion: registro.dashboard_fechaCreacion,
        },

        asignacion: {
          id: registro.asignacion_id,
          estado: registro.asignacion_estado,
          fechaAsignacion: registro.asignacion_fechaAsignacion,
          fechaDesactivacion: registro.asignacion_fechaDesactivacion,
        },
      };
    });
  }
}

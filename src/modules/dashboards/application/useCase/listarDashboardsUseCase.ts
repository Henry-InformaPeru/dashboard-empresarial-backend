import { ForbiddenException, Inject, Injectable } from '@nestjs/common';

import {
  DASHBOARD_REPOSITORY,
  type DashboardRepositoryPort,
} from '../ports/output/dashboardRepository.port';

import type { DashboardResponseDto } from '../dto/dashboardResponse.dto';

@Injectable()
export class ListarDashboardsUseCase {
  constructor(
    @Inject(DASHBOARD_REPOSITORY)
    private readonly dashboardRepository: DashboardRepositoryPort,
  ) {}

  async ejecutar(rolId: number | null): Promise<DashboardResponseDto[]> {
    if (rolId !== 1) {
      throw new ForbiddenException(
        'No tiene permisos para consultar todos los dashboards',
      );
    }

    const dashboards = await this.dashboardRepository.listarTodos();

    return dashboards.map((dashboard) => ({
      id: dashboard.id,
      codigo: dashboard.codigo,
      nombre: dashboard.nombre,
      descripcion: dashboard.descripcion,
      estado: dashboard.estado,
    }));
  }
}

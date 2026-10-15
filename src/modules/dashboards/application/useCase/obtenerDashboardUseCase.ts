import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  DASHBOARD_REPOSITORY,
  type DashboardRepositoryPort,
} from '../ports/output/dashboardRepository.port';

import type { DashboardResponseDto } from '../dto/dashboardResponse.dto';

@Injectable()
export class ObtenerDashboardUseCase {
  constructor(
    @Inject(DASHBOARD_REPOSITORY)
    private readonly dashboardRepository: DashboardRepositoryPort,
  ) {}

  async ejecutar(
    dashboardId: number,
    rolId: number | null,
  ): Promise<DashboardResponseDto> {
    if (rolId !== 1) {
      throw new ForbiddenException(
        'No tiene permisos para consultar este dashboard',
      );
    }

    const dashboard = await this.dashboardRepository.buscarPorId(dashboardId);

    if (!dashboard) {
      throw new NotFoundException('Dashboard no encontrado');
    }

    return {
      id: dashboard.id,
      codigo: dashboard.codigo,
      nombre: dashboard.nombre,
      descripcion: dashboard.descripcion,
      estado: dashboard.estado,
    };
  }
}

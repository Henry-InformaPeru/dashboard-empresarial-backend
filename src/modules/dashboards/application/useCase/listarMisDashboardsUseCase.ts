import { ForbiddenException, Inject, Injectable } from '@nestjs/common';

import {
  DASHBOARD_REPOSITORY,
  type DashboardRepositoryPort,
} from '../ports/output/dashboardRepository.port';

import type { DashboardResponseDto } from '../dto/dashboardResponse.dto';
import type { UsuarioAutenticado } from '../../../../shared/infrastructure/security/usuarioAutenticado';

@Injectable()
export class ListarMisDashboardsUseCase {
  constructor(
    @Inject(DASHBOARD_REPOSITORY)
    private readonly dashboardRepository: DashboardRepositoryPort,
  ) {}

  async ejecutar(usuario: UsuarioAutenticado): Promise<DashboardResponseDto[]> {
    if (
      usuario.rolId !== 1 &&
      (usuario.rolId !== 2 || usuario.empresaId === null)
    ) {
      throw new ForbiddenException(
        'No tiene permisos para consultar estos dashboards',
      );
    }

    const dashboards =
      usuario.empresaId !== null
        ? await this.dashboardRepository.listarPorEmpresa(usuario.empresaId)
        : (await this.dashboardRepository.listarTodos()).filter(
            (d) => d.estado === 'ACTIVO',
          );

    return dashboards.map((dashboard) => ({
      id: dashboard.id,
      codigo: dashboard.codigo,
      nombre: dashboard.nombre,
      descripcion: dashboard.descripcion,
      estado: dashboard.estado,
      urlPowerbi: dashboard.urlPowerbi,
    }));
  }
}

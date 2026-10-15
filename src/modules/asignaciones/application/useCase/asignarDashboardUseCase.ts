import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import {
  ASIGNACION_REPOSITORY,
  type AsignacionRepositoryPort,
} from '../ports/output/asignacionRepository.port';

import {
  EMPRESA_REPOSITORY,
  type EmpresaRepositoryPort,
} from '../../../empresas/application/ports/output/empresaRepository.port';

import {
  DASHBOARD_REPOSITORY,
  type DashboardRepositoryPort,
} from '../../../dashboards/application/ports/output/dashboardRepository.port';

import type { AsignacionResponseDto } from '../dto/asignacionResponse.dto';

import { AsignacionService } from '../../domain/services/asignacionService';

@Injectable()
export class AsignarDashboardUseCase {
  private readonly asignacionService = new AsignacionService();
  constructor(
    @Inject(ASIGNACION_REPOSITORY)
    private readonly asignacionRepository: AsignacionRepositoryPort,

    @Inject(EMPRESA_REPOSITORY)
    private readonly empresaRepository: EmpresaRepositoryPort,

    @Inject(DASHBOARD_REPOSITORY)
    private readonly dashboardRepository: DashboardRepositoryPort,
  ) {}

  async ejecutar(
    empresaId: number,
    dashboardId: number,
    rolId: number | null,
  ): Promise<AsignacionResponseDto> {
    if (rolId !== 1) {
      throw new ForbiddenException('No tiene permisos para asignar dashboards');
    }

    const empresa = await this.empresaRepository.buscarPorId(empresaId);

    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    const dashboard = await this.dashboardRepository.buscarPorId(dashboardId);

    if (!dashboard) {
      throw new NotFoundException('Dashboard no encontrado');
    }

    if (!this.asignacionService.puedeAsignarDashboard(dashboard.estado)) {
      throw new UnprocessableEntityException(
        'No se puede asignar un dashboard inactivo',
      );
    }

    const asignacion = await this.asignacionRepository.crear(
      empresaId,
      dashboardId,
    );

    return {
      id: asignacion.id,
      empresaId: asignacion.empresaId,
      dashboardId: asignacion.dashboardId,
      estado: asignacion.estado,
      fechaAsignacion: asignacion.fechaAsignacion,
      fechaDesactivacion: asignacion.fechaDesactivacion,
    };
  }
}

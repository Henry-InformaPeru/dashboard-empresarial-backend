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

import {
  EMPRESA_REPOSITORY,
  type EmpresaRepositoryPort,
} from '../../../empresas/application/ports/output/empresaRepository.port';

import type { DashboardEmpresaAsignacionResponseDto } from '../dto/dashboardEmpresaAsignacionResponse.dto';

@Injectable()
export class ListarDashboardsEmpresaUseCase {
  constructor(
    @Inject(DASHBOARD_REPOSITORY)
    private readonly dashboardRepository: DashboardRepositoryPort,

    @Inject(EMPRESA_REPOSITORY)
    private readonly empresaRepository: EmpresaRepositoryPort,
  ) {}

  async ejecutar(
    empresaId: number,
    rolId: number | null,
  ): Promise<DashboardEmpresaAsignacionResponseDto[]> {
    if (rolId !== 1) {
      throw new ForbiddenException(
        'No tiene permisos para consultar estas asignaciones',
      );
    }

    const empresa = await this.empresaRepository.buscarPorId(empresaId);

    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    const registros =
      await this.dashboardRepository.listarAsignadosPorEmpresa(empresaId);

    return registros.map(({ dashboard, asignacion }) => ({
      id: dashboard.id,
      codigo: dashboard.codigo,
      nombre: dashboard.nombre,
      descripcion: dashboard.descripcion,
      estado: dashboard.estado,
      asignacion: {
        id: asignacion.id,
        estado: asignacion.estado,
        fechaAsignacion: asignacion.fechaAsignacion,
        fechaDesactivacion: asignacion.fechaDesactivacion,
      },
    }));
  }
}

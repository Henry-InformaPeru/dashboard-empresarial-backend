import type { DashboardPeriodo } from '../../../domain/entities/dashboardPeriodo.entity';

export const PERIODO_REPOSITORY = Symbol('PERIODO_REPOSITORY');

export interface PeriodoRepositoryPort {
  listarPorDashboard(dashboardId: number): Promise<DashboardPeriodo[]>;

  buscarPorDashboardYPeriodo(
    dashboardId: number,
    periodo: string,
  ): Promise<DashboardPeriodo | null>;

  tieneAcceso(dashboardId: number, empresaId: number): Promise<boolean>;
}

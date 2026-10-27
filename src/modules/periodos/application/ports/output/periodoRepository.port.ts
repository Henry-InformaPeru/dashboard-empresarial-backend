import type { DashboardPeriodo } from '../../../domain/entities/dashboardPeriodo.entity';

export const PERIODO_REPOSITORY = Symbol('PERIODO_REPOSITORY');

export interface PeriodoRepositoryPort {
  listarPorDashboard(dashboardId: number): Promise<DashboardPeriodo[]>;

  buscarPorDashboardYPeriodo(
    dashboardId: number,
    periodo: string,
  ): Promise<DashboardPeriodo | null>;

  tieneAcceso(dashboardId: number, empresaId: number): Promise<boolean>;

  // urlPowerbi es el vínculo propio del periodo (opcional): sin él, el periodo usa el vínculo del reporte.
  crear(
    dashboardId: number,
    periodo: string,
    urlPowerbi: string | null,
    urlMega: string | null,
  ): Promise<DashboardPeriodo>;

  // Guarda el vínculo de Power BI en el reporte y quita el vínculo propio de sus periodos, para que todos usen el del reporte.
  // Devuelve cuántos periodos tiene el reporte.
  cambiarVinculoPowerbiDelReporte(
    dashboardId: number,
    urlPowerbi: string,
  ): Promise<number>;
}

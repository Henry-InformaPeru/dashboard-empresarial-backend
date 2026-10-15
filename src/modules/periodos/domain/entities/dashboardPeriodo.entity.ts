export interface DashboardPeriodo {
  id: number;
  dashboardId: number;
  periodo: string;
  urlPowerbi: string;
  urlMega: string | null;
  fechaCreacion: Date;
}

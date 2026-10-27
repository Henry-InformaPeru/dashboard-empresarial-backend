export interface DashboardPeriodo {
  id: number;
  dashboardId: number;
  periodo: string;
  // Vínculo que usa el periodo: el propio, o el del reporte si no tiene uno propio (null si ninguno lo tiene)
  urlPowerbi: string | null;
  urlMega: string | null;
  fechaCreacion: Date;
}

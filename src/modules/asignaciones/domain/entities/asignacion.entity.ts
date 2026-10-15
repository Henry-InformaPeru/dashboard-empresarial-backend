export type EstadoAsignacion = 'ACTIVO' | 'INACTIVO';

export interface Asignacion {
  id: number;
  empresaId: number;
  dashboardId: number;
  fechaAsignacion: Date;
  estado: EstadoAsignacion;
  fechaDesactivacion: Date | null;
}

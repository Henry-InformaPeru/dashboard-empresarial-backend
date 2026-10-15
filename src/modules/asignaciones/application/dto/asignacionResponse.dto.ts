export interface AsignacionResponseDto {
  id: number;
  empresaId: number;
  dashboardId: number;
  estado: 'ACTIVO' | 'INACTIVO';
  fechaAsignacion: Date;
  fechaDesactivacion: Date | null;
}

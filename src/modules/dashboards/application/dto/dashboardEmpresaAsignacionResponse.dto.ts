export interface DashboardEmpresaAsignacionResponseDto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  estado: string;

  asignacion: {
    id: number;
    estado: 'ACTIVO' | 'INACTIVO';
    fechaAsignacion: Date;
    fechaDesactivacion: Date | null;
  };
}

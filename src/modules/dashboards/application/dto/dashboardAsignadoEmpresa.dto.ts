import type { Dashboard } from '../../domain/entities/dashboard.entity';
import type { EstadoAsignacion } from '../../../asignaciones/domain/entities/asignacion.entity';

export interface DashboardAsignadoEmpresaDto {
  dashboard: Dashboard;
  asignacion: {
    id: number;
    estado: EstadoAsignacion;
    fechaAsignacion: Date;
    fechaDesactivacion: Date | null;
  };
}

import type { EstadoAsignacion } from '../../domain/entities/asignacion.entity';

export interface ActualizarEstadoAsignacionDto {
  empresaId: number;
  dashboardId: number;
  estado: EstadoAsignacion;
}

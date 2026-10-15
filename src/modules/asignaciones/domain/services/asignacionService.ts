import type {
  Asignacion,
  EstadoAsignacion,
} from '../entities/asignacion.entity';

export class AsignacionService {
  puedeAsignarDashboard(estadoDashboard: string): boolean {
    return estadoDashboard === 'ACTIVO';
  }

  actualizarEstado(
    asignacion: Asignacion,
    nuevoEstado: EstadoAsignacion,
    fechaActual: Date,
  ): Asignacion {
    if (asignacion.estado === nuevoEstado) {
      return asignacion;
    }

    return {
      ...asignacion,
      estado: nuevoEstado,
      fechaDesactivacion: nuevoEstado === 'INACTIVO' ? fechaActual : null,
    };
  }
}

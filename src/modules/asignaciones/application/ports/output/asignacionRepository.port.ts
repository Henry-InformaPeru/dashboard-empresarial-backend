import type { Asignacion } from '../../../domain/entities/asignacion.entity';

export const ASIGNACION_REPOSITORY = Symbol('ASIGNACION_REPOSITORY');

export type ActualizadorAsignacion = (asignacion: Asignacion) => Asignacion;

export interface AsignacionRepositoryPort {
  crear(empresaId: number, dashboardId: number): Promise<Asignacion>;

  actualizarEnTransaccion(
    empresaId: number,
    dashboardId: number,
    actualizar: ActualizadorAsignacion,
  ): Promise<Asignacion | null>;
}
